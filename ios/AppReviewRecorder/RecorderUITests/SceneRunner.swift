import XCTest

// Plays a scene file (scenes.json) on a real iPhone: taps, typing, swipes,
// file pickers, system alerts and the iOS screen recording. Nothing in here
// knows about Spartopf — the app, its labels and the flow all come from the
// scene file, so the same runner records any app.
//
// Elements are found the way scripts/rehearse-app-review.mjs finds them in
// the web build: by accessibility label, exact first, then "starts with",
// then "contains"; buttons and fields before plain text; in screen order.

// MARK: - The scene file

/// Any JSON value, so a step can carry whatever keys it needs.
enum JSONValue: Decodable {
    case string(String), number(Double), bool(Bool), array([JSONValue]), object([String: JSONValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([JSONValue].self) { self = .array(a) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }

    var strings: [String]? {
        switch self {
        case .string(let s): return [s]
        case .array(let a): return a.compactMap { if case .string(let s) = $0 { return s } else { return nil } }
        default: return nil
        }
    }
}

struct Step {
    let raw: [String: JSONValue]

    func has(_ key: String) -> Bool { raw[key] != nil }
    func string(_ key: String) -> String? { if case .string(let s)? = raw[key] { return s }; return nil }
    func strings(_ key: String) -> [String]? { raw[key]?.strings }
    func number(_ key: String) -> Double? { if case .number(let n)? = raw[key] { return n }; return nil }
    func int(_ key: String) -> Int? { number(key).map { Int($0) } }
    func bool(_ key: String) -> Bool { if case .bool(let b)? = raw[key] { return b }; return false }
    func steps(_ key: String) -> [Step]? {
        guard case .array(let a)? = raw[key] else { return nil }
        return a.compactMap { if case .object(let o) = $0 { return Step(raw: o) } else { return nil } }
    }
    func with(_ key: String, default value: Double) -> Step {
        guard raw[key] == nil else { return self }
        var r = raw; r[key] = .number(value); return Step(raw: r)
    }

    /// One line for the log, e.g. `tap "Save" nth=1`.
    var summary: String {
        raw.sorted { $0.key < $1.key }.map { key, value in
            switch value {
            case .string(let s): return "\(key)=\"\(s)\""
            case .number(let n): return "\(key)=\(n.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(n)) : String(n))"
            case .bool(let b): return b ? key : "\(key)=false"
            case .array(let a): return "\(key)=[\(a.count)]"
            default: return key
            }
        }.joined(separator: " ")
    }
}

struct SceneSpec { let name: String; let steps: [Step] }

struct RecordingSpec {
    let bundleId: String
    let iconName: String
    let scenes: [SceneSpec]
    let system: [String: [String]]
    let mustSeeFirst: [String]

    init(json data: Data) throws {
        guard case .object(let root) = try JSONDecoder().decode(JSONValue.self, from: data),
              case .object(let app)? = root["app"],
              case .string(let bundleId)? = app["bundleId"],
              case .array(let scenes)? = root["scenes"] else {
            throw StepFailure("scenes.json needs app.bundleId and scenes")
        }
        self.bundleId = bundleId
        if case .string(let icon)? = app["iconName"] { iconName = icon } else { iconName = "" }
        self.scenes = scenes.compactMap { scene in
            guard case .object(let s) = scene, case .string(let name)? = s["name"], case .array(let steps)? = s["steps"] else { return nil }
            return SceneSpec(name: name, steps: steps.compactMap { if case .object(let o) = $0 { return Step(raw: o) } else { return nil } })
        }
        var system: [String: [String]] = [:]
        if case .object(let sys)? = root["system"] { for (k, v) in sys { system[k] = v.strings ?? [] } }
        self.system = system
        if case .object(let pre)? = root["preflight"], let must = pre["mustSee"]?.strings { mustSeeFirst = must } else { mustSeeFirst = [] }
    }
}

struct StepFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

// MARK: - The runner

final class SceneRunner {
    let spec: RecordingSpec
    let app: XCUIApplication
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    /// Multiplies every pause: 1.5 is slower, 0.5 faster.
    let pace: Double
    /// Skip starting and stopping the screen recording (a dry run).
    let noVideo: Bool
    private(set) var recording = false

    init(spec: RecordingSpec, pace: Double, noVideo: Bool) {
        self.spec = spec
        self.pace = pace
        self.noVideo = noVideo
        app = XCUIApplication(bundleIdentifier: spec.bundleId)
    }

    func log(_ message: String) { print("[recorder] \(message)") }

    private func rest(_ seconds: Double) { Thread.sleep(forTimeInterval: max(0, seconds)) }
    /// A short beat after every action, so a viewer can follow.
    private func settle() { rest(0.45 * pace) }

    private func system(_ key: String, _ fallback: [String]) -> [String] {
        let custom = spec.system[key] ?? []
        return custom.isEmpty ? fallback : custom
    }

    // MARK: Running

    /// Before recording: the app must be freshly installed (its welcome card
    /// showing), so the video starts empty and no real data is ever filmed.
    func preflight() throws {
        log("Preflight: is \(spec.bundleId) installed and empty?")
        app.activate()
        guard app.wait(for: .runningForeground, timeout: 20) else {
            throw StepFailure("\(spec.bundleId) didn't start. Is it installed from TestFlight on this iPhone?")
        }
        rest(2)
        if !spec.mustSeeFirst.isEmpty {
            guard (try? seen(spec.mustSeeFirst, timeout: 12)) != nil else {
                throw StepFailure("The app isn't empty on this iPhone (no welcome card). Back up your own data, delete the app, install it again from TestFlight, and run this again. Nothing was recorded.")
            }
        }
        app.terminate()
        XCUIDevice.shared.press(.home)
        rest(1.5)
    }

    func run(scenes range: ClosedRange<Int>) throws {
        for index in range {
            let scene = spec.scenes[index - 1]
            log("Scene \(index): \(scene.name)")
            try XCTContext.runActivity(named: "Scene \(index): \(scene.name)") { _ in
                for (n, step) in scene.steps.enumerated() {
                    do {
                        try perform(step)
                    } catch {
                        if step.bool("soft") { log("  ~ step \(n + 1) skipped (\(step.summary)): \(error)"); continue }
                        throw StepFailure("Scene \(index) “\(scene.name)”, step \(n + 1) (\(step.summary)): \(error)")
                    }
                }
            }
        }
    }

    func perform(_ step: Step) throws {
        if let group = step.steps("optional") {
            guard let first = group.first else { return }
            do { try perform(first.with("timeout", default: 2)) } catch { log("  ~ optional steps skipped: \(error)"); return }
            for s in group.dropFirst() { try perform(s) }
            return
        }
        if let p = step.number("pause") { rest(p * pace); return }
        if step.bool("startRecording") { try startScreenRecording(); return }
        if step.bool("stopRecording") { try stopScreenRecording(); return }
        if step.bool("launch") { launchFromHomeScreen(); return }
        if step.bool("home") { XCUIDevice.shared.press(.home); rest(1); return }
        if step.bool("terminate") { app.terminate(); rest(1); return }
        if step.bool("appSwitcher") { openAppSwitcher(); return }
        if step.bool("faceID") { waitForFaceID(); return }
        if let labels = step.strings("systemAlert") { try tapSystemAlert(labels); return }
        if let labels = step.strings("systemTap") { try tapSystemButton(labels); return }
        if let note = step.string("note") { log(note); return }

        let nth = step.int("nth") ?? 0
        let timeout = step.number("timeout") ?? 8

        if let labels = step.strings("tap") {
            let el = try element(labels, nth: nth, role: step.string("role"), timeout: timeout)
            try tap(el)
            if let file = step.string("pickFile") { try pickFile(file) }
            settle(); return
        }
        if let labels = step.strings("fill") {
            let el = try element(labels, nth: nth, role: "textbox", timeout: timeout)
            try replaceText(in: el, with: step.string("text") ?? "")
            settle(); return
        }
        if let text = step.string("type") { try typeIntoFocused(text); settle(); return }
        if let amount = step.string("amount") {
            let text = localizedAmount(amount)
            if let into = step.strings("into") {
                try replaceText(in: try element(into, nth: nth, role: "textbox", timeout: timeout), with: text)
            } else {
                try typeIntoFocused(text)
            }
            settle(); return
        }
        if let minus = step.number("placeholderMinus"), let into = step.strings("into") {
            let el = try element(into, nth: nth, role: "textbox", timeout: timeout)
            guard let figure = parseNumber(el.placeholderValue ?? "") else { throw StepFailure("no number in the placeholder of \(into)") }
            try replaceText(in: el, with: localizedAmount(String(format: "%.2f", figure - minus)))
            settle(); return
        }
        if let labels = step.strings("see") { _ = try seen(labels, timeout: step.number("timeout") ?? 10); return }
        if let labels = step.strings("scrollTo") {
            try scrollIntoView(try element(labels, nth: nth, role: step.string("role"), timeout: step.number("timeout") ?? 6))
            return
        }
        if let direction = step.string("swipe"), let on = step.strings("on") {
            let el = try element(on, nth: nth, role: nil, timeout: timeout)
            try scrollIntoView(el)
            swipeAcross(el, toLeft: direction == "left")
            settle(); return
        }
        if let from = step.strings("drag"), let to = step.strings("to") {
            let a = try element(from, nth: nth, role: nil, timeout: timeout)
            try scrollIntoView(a)
            let b = try element(to, nth: step.int("toNth") ?? 0, role: nil, timeout: timeout)
            a.press(forDuration: step.number("hold") ?? 0.8, thenDragTo: b, withVelocity: .slow, thenHoldForDuration: 0.4)
            settle(); return
        }
        if let day = step.int("pickDay") { try pickDay(day, opener: step.strings("on") ?? ["Date:"]); settle(); return }
        if let option = step.string("select"), let box = step.strings("in") {
            try select(option, in: box, nth: nth)
            settle(); return
        }
        if let direction = step.string("scroll") { scroll(down: direction != "up"); settle(); return }
        if let key = step.string("key") { try typeIntoFocused(key == "Enter" ? "\n" : key); settle(); return }
        throw StepFailure("unknown step: \(step.summary)")
    }

    // MARK: Finding elements

    enum Mode { case exact, prefix, contains }

    private static let preferred: [XCUIElement.ElementType] = [
        .button, .switch, .toggle, .checkBox, .textField, .secureTextField, .searchField, .textView,
        .link, .radioButton, .popUpButton, .comboBox, .menuItem, .cell, .slider, .tab, .image, .staticText, .other,
    ]

    private func types(for role: String?) -> [XCUIElement.ElementType] {
        switch role {
        case "button": return [.button]
        case "switch", "checkbox": return [.switch, .toggle, .checkBox, .button]
        case "textbox": return [.textField, .secureTextField, .searchField, .textView]
        case "select": return [.popUpButton, .comboBox, .button, .other]
        default: return Self.preferred
        }
    }

    /// Commas and runs of spaces differ between WebKit on iOS and Chromium; ignore them.
    private func normalized(_ s: String) -> String {
        s.replacingOccurrences(of: ",", with: " ")
            .split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    private func matches(_ label: String, _ wanted: String, _ mode: Mode) -> Bool {
        let l = normalized(label), w = normalized(wanted)
        guard !l.isEmpty, !w.isEmpty else { return false }
        switch mode {
        case .exact: return l == w
        case .prefix: return l.hasPrefix(w)
        case .contains: return l.contains(w)
        }
    }

    /// Every element in screen-reader order.
    private func flatSnapshot(of root: XCUIApplication) -> [XCUIElementSnapshot] {
        guard let snap = try? root.snapshot() else { return [] }
        var out: [XCUIElementSnapshot] = []
        func walk(_ s: XCUIElementSnapshot) { out.append(s); s.children.forEach(walk) }
        walk(snap)
        return out
    }

    /// The nth element with this label (exact, then starts with, then contains),
    /// of the most likely type. Waits up to `timeout` seconds for it to appear.
    func element(_ labels: [String], nth: Int, role: String?, timeout: Double,
                 in root: XCUIApplication? = nil, modes: [Mode] = [.exact, .prefix, .contains]) throws -> XCUIElement {
        let root = root ?? app
        let allowed = types(for: role)
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            // Fast: let the device search by label.
            for wanted in labels {
                for mode in modes {
                    let format = mode == .exact ? "label == %@" : mode == .prefix ? "label BEGINSWITH %@" : "label CONTAINS %@"
                    let found = root.descendants(matching: .any).matching(NSPredicate(format: format, wanted)).allElementsBoundByIndex
                    guard !found.isEmpty else { continue }
                    let typed = found.map { ($0, $0.elementType) }
                    for type in allowed {
                        let ofType = typed.filter { $0.1 == type }.map { $0.0 }
                        if ofType.count > nth, ofType[nth].exists { return ofType[nth] }
                    }
                }
            }
            // Thorough: the whole tree, with commas and runs of spaces ignored.
            let all = flatSnapshot(of: root)
            for wanted in labels {
                for mode in modes {
                    let hits = all.filter { allowed.contains($0.elementType) && matches($0.label, wanted, mode) }
                    guard !hits.isEmpty else { continue }
                    for type in allowed {
                        let ofType = hits.filter { $0.elementType == type }
                        guard ofType.count > nth else { continue }
                        let pick = ofType[nth]
                        // Find it again as a live element: same type, same label, same position among those.
                        let sameLabel = all.filter { $0.elementType == type && $0.label == pick.label }
                        let k = sameLabel.firstIndex { ($0 as AnyObject) === (pick as AnyObject) } ?? 0
                        let el = root.descendants(matching: type).matching(NSPredicate(format: "label == %@", pick.label)).element(boundBy: k)
                        if el.exists { return el }
                    }
                }
            }
            rest(0.4)
        } while Date() < deadline
        throw StepFailure("not found: \(labels.joined(separator: " | "))\(nth > 0 ? " #\(nth)" : "")")
    }

    /// Waits until some element's label or value contains one of the texts.
    @discardableResult
    func seen(_ texts: [String], timeout: Double) throws -> String {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for t in texts where app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", t)).firstMatch.exists {
                return t
            }
            for s in flatSnapshot(of: app) {
                let value = (s.value as? String) ?? ""
                if let hit = texts.first(where: { matches(s.label, $0, .contains) || matches(value, $0, .contains) }) { return hit }
            }
            rest(0.5)
        } while Date() < deadline
        throw StepFailure("not seen: \(texts.joined(separator: " | "))")
    }

    // MARK: Acting

    private var window: CGRect { app.windows.firstMatch.exists ? app.windows.firstMatch.frame : app.frame }

    /// The part of the screen not under the keyboard.
    private var visible: CGRect {
        var w = window
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists, keyboard.frame.minY > w.minY { w.size.height = keyboard.frame.minY - w.minY }
        return w
    }

    func tap(_ el: XCUIElement) throws {
        try scrollIntoView(el)
        let f = el.frame
        if el.isHittable {
            el.tap()
        } else if !f.isEmpty && visible.contains(CGPoint(x: f.midX, y: f.midY)) {
            // WebKit sometimes calls a visible element not hittable: tap its middle.
            el.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        } else {
            throw StepFailure("can't reach “\(el.label)” on screen")
        }
    }

    func scrollIntoView(_ el: XCUIElement) throws {
        guard el.exists else { throw StepFailure("gone: \(el.label)") }
        var tries = 0
        while tries < 8 {
            let f = el.frame, v = visible
            let middle = CGPoint(x: f.midX, y: f.midY)
            if el.isHittable && v.contains(middle) { return }
            // On screen, away from the bars: close enough, whatever WebKit says about hittability.
            if v.contains(middle) && f.midY > v.minY + 90 && f.midY < v.maxY - 100 { return }
            scroll(down: f.midY > v.midY)
            tries += 1
        }
    }

    /// Moves the page (or the open sheet) by about a third of what is visible.
    func scroll(down: Bool) {
        let v = visible, w = window
        let top = (v.minY + v.height * 0.3 - w.minY) / w.height
        let bottom = (v.minY + v.height * 0.75 - w.minY) / w.height
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? bottom : top))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: down ? top : bottom))
        from.press(forDuration: 0.05, thenDragTo: to, withVelocity: .default, thenHoldForDuration: 0.1)
        rest(0.5)
    }

    /// A swipe across the whole row, like a thumb (85 % → 10 % of the width).
    func swipeAcross(_ el: XCUIElement, toLeft: Bool) {
        let w = window.width, y = el.frame.midY
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: toLeft ? w * 0.85 : w * 0.15, dy: y))
        let end = origin.withOffset(CGVector(dx: toLeft ? w * 0.10 : w * 0.90, dy: y))
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .fast, thenHoldForDuration: 0)
    }

    private func waitForKeyboard(_ seconds: Double = 3) -> Bool {
        app.keyboards.firstMatch.waitForExistence(timeout: seconds)
    }

    func typeIntoFocused(_ text: String) throws {
        guard waitForKeyboard() else { throw StepFailure("no keyboard – nothing has focus") }
        app.typeText(text)
    }

    /// Focuses the field with the caret at its end, deletes what is there, types the text.
    func replaceText(in el: XCUIElement, with text: String) throws {
        try scrollIntoView(el)
        el.coordinate(withNormalizedOffset: CGVector(dx: 0.96, dy: 0.5)).tap()
        if !waitForKeyboard(2) { el.tap() }
        guard waitForKeyboard() else { throw StepFailure("the field “\(el.label)” didn't take focus") }
        let current = (el.value as? String) ?? ""
        if !current.isEmpty && current != el.placeholderValue {
            el.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 2))
        }
        el.typeText(text)
    }

    /// "12.50" typed with the iPhone's own decimal separator (the decimal pad has only that one).
    func localizedAmount(_ s: String) -> String {
        let sep = Locale.current.decimalSeparator ?? "."
        return s.replacingOccurrences(of: ".", with: sep)
    }

    func parseNumber(_ s: String) -> Double? {
        var t = s.filter { "0123456789.,-".contains($0) }
        if let lastComma = t.lastIndex(of: ","), let lastDot = t.lastIndex(of: ".") {
            // Whichever comes last is the decimal mark; the other groups thousands.
            if lastComma > lastDot { t = t.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".") }
            else { t = t.replacingOccurrences(of: ",", with: "") }
        } else {
            t = t.replacingOccurrences(of: ",", with: ".")
        }
        return Double(t)
    }

    // MARK: System UI

    func select(_ option: String, in labels: [String], nth: Int) throws {
        let box = try element(labels, nth: nth, role: "select", timeout: 6)
        try tap(box)
        rest(0.8)
        // Older iOS: a picker wheel with Done.
        let wheel = app.pickerWheels.firstMatch
        if wheel.exists {
            wheel.adjust(toPickerWheelValue: option)
            if let done = try? element(system("done", ["Done", "Fertig"]), nth: 0, role: "button", timeout: 2, modes: [.exact]) { done.tap() }
            return
        }
        // Today: a menu of the options. Take the first one that can be tapped.
        let deadline = Date().addingTimeInterval(5)
        repeat {
            let query = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", option))
            for el in query.allElementsBoundByIndex where el.exists && el.frame != box.frame {
                if el.isHittable { el.tap(); return }
            }
            // A long menu: scroll it a little and look again.
            if let menu = query.allElementsBoundByIndex.first(where: { $0.exists }) , !menu.isHittable {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.6))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4)))
            }
            rest(0.4)
        } while Date() < deadline
        throw StepFailure("option “\(option)” not in the menu")
    }

    /// After an `<input type=file>` was tapped: through the system menu (for
    /// pictures) to the Files picker, search the file by name and open it.
    func pickFile(_ name: String) throws {
        let stem = (name as NSString).deletingPathExtension
        if let choose = try? element(system("chooseFile", ["Choose File", "Datei auswählen", "Browse", "Durchsuchen"]),
                                     nth: 0, role: nil, timeout: 3, modes: [.exact, .prefix]), choose.isHittable {
            choose.tap()
            rest(1.2)
        }
        let search = app.searchFields.firstMatch
        guard search.waitForExistence(timeout: 10) else {
            throw StepFailure("the Files picker didn't open (or has no search field)")
        }
        search.tap()
        _ = waitForKeyboard()
        search.typeText(stem)
        rest(2.5 * pace)
        let file = try element([stem], nth: 0, role: nil, timeout: 10)
        guard file.elementType != .searchField else { throw StepFailure("\(name) not found in Files – AirDrop it to the iPhone first") }
        try tap(file)
        rest(1)
    }

    /// The system date picker: tap the field, then the day in the calendar.
    func pickDay(_ day: Int, opener: [String]) throws {
        let field = try element(opener, nth: 0, role: nil, timeout: 4)
        try tap(field)
        let picker = app.datePickers.firstMatch
        guard picker.waitForExistence(timeout: 4) else { throw StepFailure("no date picker") }
        let days = picker.buttons.matching(NSPredicate(format: "label MATCHES %@", ".*(^|\\D)\(day)(\\D|$).*"))
        guard let button = days.allElementsBoundByIndex.first(where: { $0.isHittable }) else {
            throw StepFailure("day \(day) not in the calendar")
        }
        button.tap()
        rest(0.6)
        if let done = try? element(system("done", ["Done", "Fertig"]), nth: 0, role: "button", timeout: 1, modes: [.exact]), done.isHittable {
            done.tap()
        } else {
            let region = app.otherElements["PopoverDismissRegion"]
            if region.exists { region.tap() } else { app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.05)).tap() }
        }
    }

    func tapSystemAlert(_ labels: [String]) throws {
        for root in [springboard, app] {
            let alert = root.alerts.firstMatch
            if alert.waitForExistence(timeout: root === springboard ? 4 : 1) {
                for l in labels where alert.buttons[l].exists { alert.buttons[l].tap(); rest(0.8); return }
                throw StepFailure("alert without \(labels)")
            }
        }
        throw StepFailure("no system alert")
    }

    /// A button in system UI shown over the app (the share sheet's Close).
    func tapSystemButton(_ labels: [String]) throws {
        for root in [app, springboard] {
            if let el = try? element(labels, nth: 0, role: "button", timeout: root === app ? 4 : 1, in: root, modes: [.exact]), el.isHittable {
                el.tap(); rest(0.8); return
            }
        }
        throw StepFailure("no \(labels.joined(separator: " | ")) to tap")
    }

    func launchFromHomeScreen() {
        XCUIDevice.shared.press(.home)
        rest(1.2)
        let icon = springboard.icons[spec.iconName]
        if !spec.iconName.isEmpty && icon.waitForExistence(timeout: 3) && icon.isHittable {
            icon.tap()
        } else {
            log("  the \(spec.iconName) icon isn't on this home screen page – starting the app directly")
            app.activate()
        }
        _ = app.wait(for: .runningForeground, timeout: 20)
        rest(2)
    }

    func openAppSwitcher() {
        let bottom = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.998))
        let middle = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.6))
        bottom.press(forDuration: 0.05, thenDragTo: middle, withVelocity: .slow, thenHoldForDuration: 1.2)
        rest(1)
    }

    /// Face ID happens outside the app: whoever holds the iPhone looks at it.
    func waitForFaceID() {
        log("  Face ID – look at the iPhone")
        rest(3.5)
    }

    // MARK: Screen recording

    private func openControlCenter() {
        // Slow, short pull with a hold at the end: a fast fling opens Control Center
        // and carries on to its second page (connectivity), away from Screen Recording.
        let start = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.005))
        let end = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.3))
        start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.4)
        rest(1.5)
    }

    private var recordLabels: [String] { system("screenRecording", ["Screen Recording", "Bildschirmaufnahme"]) }

    /// Control Center has several pages (iOS 18+) and can't "scroll to visible".
    /// Look for the button; if it's missing or above the screen, swipe back a page;
    /// if it's below, swipe on a page. Then tap its centre by coordinate.
    private func tapRecordButton() throws {
        let screen = springboard.frame
        let visible = screen.insetBy(dx: 0, dy: 40)
        for attempt in 0..<5 {
            let button = try? element(recordLabels, nth: 0, role: nil, timeout: 2, in: springboard, modes: [.exact, .prefix])
            var centre: CGPoint? = nil
            if let button = button {
                // Let any page animation settle.
                var last = CGPoint(x: button.frame.midX, y: button.frame.midY)
                for _ in 0..<5 { rest(0.25); let now = CGPoint(x: button.frame.midX, y: button.frame.midY); if now == last { break }; last = now }
                centre = last
            }
            if let c = centre, visible.contains(c) {
                springboard.coordinate(withNormalizedOffset: .zero)
                    .withOffset(CGVector(dx: c.x - screen.minX, dy: c.y - screen.minY)).tap()
                return
            }
            let goBack = centre == nil || centre!.y < screen.midY // missing or on an earlier page → swipe down
            log("  Screen Recording \(centre == nil ? "not found" : "off screen (y \(Int(centre!.y)))") – swiping Control Center \(goBack ? "down" : "up") (\(attempt + 1))")
            let from = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: goBack ? 0.35 : 0.7))
            let to = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: goBack ? 0.7 : 0.35))
            from.press(forDuration: 0.05, thenDragTo: to, withVelocity: .default, thenHoldForDuration: 0.2)
            rest(1)
        }
        attachScreenshot(named: "Control Center – no Screen Recording")
        XCUIDevice.shared.press(.home)
        throw StepFailure("couldn't reach Screen Recording in Control Center – check it's on the first page (long-press an empty spot › Add a Control › Screen Recording)")
    }

    func startScreenRecording() throws {
        guard !noVideo else { log("  (dry run – not recording)"); return }
        XCUIDevice.shared.press(.home)
        rest(1)
        openControlCenter()
        try tapRecordButton()
        recording = true
        rest(4.5) // the 3-2-1 countdown
        XCUIDevice.shared.press(.home)
        rest(1.5)
    }

    func stopScreenRecording() throws {
        guard recording else { return }
        openControlCenter()
        try? tapRecordButton()
        recording = false
        rest(1.5)
        XCUIDevice.shared.press(.home)
        rest(2)
        log("Recording stopped – the video is in Photos.")
    }

    /// After a failure: stop, so the part that was filmed is kept.
    func stopRecordingIfNeeded() { try? stopScreenRecording() }

    func attachScreenshot(named name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        XCTContext.runActivity(named: name) { $0.add(shot) }
    }
}
