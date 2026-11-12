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
    /// preflight.reset: steps that empty the app when it isn't (never filmed).
    let resetSteps: [Step]

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
        if case .object(let pre)? = root["preflight"] { resetSteps = Step(raw: pre).steps("reset") ?? [] } else { resetSteps = [] }
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
    /// Empty the app with preflight.reset when it isn't (the script asked first).
    let reset: Bool
    private(set) var recording = false

    init(spec: RecordingSpec, pace: Double, noVideo: Bool, reset: Bool = false) {
        self.spec = spec
        self.pace = pace
        self.noVideo = noVideo
        self.reset = reset
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

    /// Before recording: the app must be empty (its welcome card showing), so
    /// the video starts from scratch. When it isn't and resetting is allowed,
    /// preflight.reset empties it first — before the screen recording starts.
    func preflight() throws {
        log("Preflight: is \(spec.bundleId) installed and empty?")
        app.terminate()
        app.activate()
        guard app.wait(for: .runningForeground, timeout: 20) else {
            throw StepFailure("\(spec.bundleId) didn't start. Is it installed from TestFlight on this iPhone?")
        }
        rest(0.6)
        // With reset on, every full run starts from a freshly reset app: what
        // shows on screen doesn't prove it's empty (a run that stopped in scene 2
        // left the balance and the salary behind the welcome card), and changed
        // settings don't show at all.
        if reset && !spec.resetSteps.isEmpty {
            log("Resetting the app (not recorded) …")
            for (n, step) in spec.resetSteps.enumerated() {
                do { try perform(step) } catch {
                    if step.bool("soft") { continue }
                    throw StepFailure("Resetting the app, step \(n + 1) (\(step.summary)): \(error). Nothing was recorded.")
                }
            }
            // Reset app lands on the month page with the setup card: check it there
            // (a relaunch here cost ~6 s; the recording starts with one anyway).
            guard spec.mustSeeFirst.isEmpty || (try? seen(spec.mustSeeFirst, timeout: 12)) != nil else {
                throw StepFailure("After Reset app the first setup question doesn't show – the screenshot in the .xcresult shows where it stopped. Nothing was recorded.")
            }
            log("App reset – it's empty now.")
        } else if !spec.mustSeeFirst.isEmpty && (try? seen(spec.mustSeeFirst, timeout: 12)) == nil {
            throw StepFailure("The app isn't empty on this iPhone (the first setup question doesn't show). Run it without RESET=0 to reset it, or delete the app and install it again from TestFlight. Nothing was recorded.")
        }
        app.terminate() // the recording starts with a cold launch from the home screen
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
            try replaceText(in: el, with: step.string("text") ?? "", check: true)
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
    private func flatSnapshot(of root: XCUIElement) -> [XCUIElementSnapshot] {
        guard let snap = try? root.snapshot() else { return [] }
        var out: [XCUIElementSnapshot] = []
        func walk(_ s: XCUIElementSnapshot) { out.append(s); s.children.forEach(walk) }
        walk(snap)
        return out
    }

    /// Of several elements with the same label, the one a finger can reach. A
    /// confirmation's button is often named like the row that opened it ("Reset
    /// app"): the row stays in the tree behind the dialog, comes first, and a tap
    /// on it hits the dimmed background, which closes the dialog. So when the
    /// first is on screen but covered, the first that can be tapped wins. (One
    /// that is merely scrolled away is still scrolled to, as in the rehearsal.)
    private func uncovered(_ found: [XCUIElement], nth: Int) -> XCUIElement {
        let first = found[nth]
        guard nth == 0, found.count > 1 else { return first }
        let f = first.frame
        guard !f.isEmpty, window.contains(CGPoint(x: f.midX, y: f.midY)), !first.isHittable else { return first }
        return found.dropFirst().first(where: { $0.exists && $0.isHittable }) ?? first
    }

    /// The nth element with this label (exact, then starts with, then contains),
    /// of the most likely type. Waits up to `timeout` seconds for it to appear.
    func element(_ labels: [String], nth: Int, role: String?, timeout: Double,
                 in root: XCUIApplication? = nil, modes: [Mode] = [.exact, .prefix, .contains]) throws -> XCUIElement {
        let root = root ?? app
        let allowed = types(for: role)
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            // Like the rehearsal: while a dialog is open, look in it first. WebKit keeps
            // what is behind a confirmation in the tree, and its "Reset app" button came
            // after the row that opened it – the tap went to the row behind the dialog,
            // hit the dimmed background and closed it. Then the whole app, as before.
            var scopes: [XCUIElement] = []
            if root === app, let dialog = openDialog() { scopes.append(dialog) }
            scopes.append(root)
            for scope in scopes {
                if let el = search(labels, nth: nth, allowed: allowed, modes: modes, in: scope) { return el }
            }
            rest(0.4)
        } while Date() < deadline
        throw StepFailure("not found: \(labels.joined(separator: " | "))\(nth > 0 ? " #\(nth)" : "")")
    }

    /// The open web dialog (a sheet or a confirmation), the newest if several:
    /// WebKit labels it "<title>, web dialog" / "web alert dialog" ("dialogue" in
    /// British English, "Dialog" in German). The outermost of nested copies.
    private func openDialog() -> XCUIElement? {
        let found = app.descendants(matching: .other)
            .matching(NSPredicate(format: "label CONTAINS[c] %@", "dialog")).allElementsBoundByIndex
            .filter { $0.exists }
        let frames = found.map { $0.frame }
        let outer = found.indices.filter { i in
            !frames[i].isEmpty && !found.indices.contains { j in
                j != i && frames[j].contains(frames[i]) && (frames[j] != frames[i] || j < i)
            }
        }
        return outer.last.map { found[$0] }
    }

    /// One search for `element`, inside `scope`: the device's own label search first,
    /// then the whole tree with commas and runs of spaces ignored.
    private func search(_ labels: [String], nth: Int, allowed: [XCUIElement.ElementType], modes: [Mode],
                        in scope: XCUIElement) -> XCUIElement? {
        // Fast: let the device search by label.
        for wanted in labels {
            for mode in modes {
                let format = mode == .exact ? "label == %@" : mode == .prefix ? "label BEGINSWITH %@" : "label CONTAINS %@"
                let found = scope.descendants(matching: .any).matching(NSPredicate(format: format, wanted)).allElementsBoundByIndex
                guard !found.isEmpty else { continue }
                let typed = found.map { ($0, $0.elementType) }
                for type in allowed {
                    let ofType = typed.filter { $0.1 == type }.map { $0.0 }
                    if ofType.count > nth, ofType[nth].exists { return uncovered(ofType, nth: nth) }
                }
            }
        }
        // Thorough: the whole tree, with commas and runs of spaces ignored.
        let all = flatSnapshot(of: scope)
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
                    let el = scope.descendants(matching: type).matching(NSPredicate(format: "label == %@", pick.label)).element(boundBy: k)
                    if el.exists { return el }
                }
            }
        }
        return nil
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

    private var keyboardTopCache: (keys: CGRect, top: CGFloat, at: Date)?

    /// Where the keyboard really starts, or nil without one. Its own frame is
    /// only the rows of keys: the suggestions bar and the ‹ › ✓ bar a web form
    /// gets sit above it, cover the page and swallow taps (a tap meant for a
    /// button hidden there once typed a space instead). So: the highest native
    /// element – anything outside the web view – that starts just above the keys.
    private func keyboardTop() -> CGFloat? {
        let keyboard = app.keyboards.firstMatch
        guard keyboard.exists else { return nil }
        let keys = keyboard.frame
        guard keys.height > 0 else { return nil }
        if let cached = keyboardTopCache, cached.keys == keys, Date().timeIntervalSince(cached.at) < 3 { return cached.top }
        var top = keys.minY
        if let snap = try? app.snapshot() {
            var bars: [CGRect] = [], native: [CGRect] = []
            var hasWebView = false
            func walk(_ s: XCUIElementSnapshot, web inWeb: Bool, bar inBar: Bool) {
                let type = s.elementType
                if type == .webView { hasWebView = true }
                let web = inWeb || type == .webView
                let bar = inBar || (!web && (type == .toolbar || type == .keyboard))
                let f = s.frame
                if !web, f.width > 0, f.height > 0, f.minY < keys.minY, f.minY >= keys.minY - 130 {
                    if bar { bars.append(f) } else { native.append(f) }
                }
                for child in s.children { walk(child, web: web, bar: bar) }
            }
            walk(snap, web: false, bar: false)
            // Without a web view in the tree nothing tells page from keyboard: trust only the bars.
            for f in bars + (hasWebView ? native : []) { top = min(top, f.minY) }
        }
        keyboardTopCache = (keys: keys, top: top, at: Date())
        return top
    }

    /// The part of the screen a finger can reach: not under the keyboard or its bars.
    private func visibleArea() -> (rect: CGRect, keyboard: Bool) {
        var w = window
        guard let top = keyboardTop(), top - 6 > w.minY else { return (rect: w, keyboard: false) }
        w.size.height = top - 6 - w.minY
        return (rect: w, keyboard: true)
    }

    private var visible: CGRect { visibleArea().rect }

    /// What takes a tap in the screen reader's tree.
    private static let pressable: Set<XCUIElement.ElementType> = [
        .button, .key, .switch, .toggle, .link, .textField, .secureTextField, .searchField, .textView,
        .checkBox, .radioButton, .popUpButton, .comboBox, .slider, .menuItem,
    ]

    /// Scrolls the element into view and makes sure the finger lands on it. With
    /// the keyboard up, the element can be behind it, or behind something the
    /// page keeps just above it: Spartopf's + − × ÷ row covers the Date and Paid
    /// buttons, and a tap meant for the date once typed "+" into the amount.
    /// Then the keyboard goes away first, the way a person would put it away.
    private func reach(_ el: XCUIElement, dx: CGFloat = 0.5) throws {
        try scrollIntoView(el)
        let area = visibleArea()
        let f = el.frame
        guard area.keyboard, !f.isEmpty else { return }
        let point = CGPoint(x: f.minX + f.width * dx, y: f.midY)
        let blocker: String
        if point.y > area.rect.maxY {
            blocker = "the keyboard"
        } else if let over = coveringElement(el, at: point) {
            blocker = "“\(over)”"
        } else {
            return
        }
        log("  \(blocker) covers “\(el.label)” – putting the keyboard away")
        try hideKeyboard()
        try scrollIntoView(el)
    }

    /// What else is under `point`: a button or field that is neither `el` nor
    /// around or inside it – a row the page keeps above the keyboard, say.
    private func coveringElement(_ el: XCUIElement, at point: CGPoint) -> String? {
        guard let snap = try? app.snapshot() else { return nil }
        let type = el.elementType, label = el.label, frame = el.frame
        func isTarget(_ s: XCUIElementSnapshot) -> Bool {
            s.elementType == type && s.label == label
                && abs(s.frame.minX - frame.minX) < 3 && abs(s.frame.minY - frame.minY) < 3
                && abs(s.frame.width - frame.width) < 3 && abs(s.frame.height - frame.height) < 3
        }
        var over: String?
        // Whether `el` is in this branch: what holds it doesn't cover it.
        func walk(_ s: XCUIElementSnapshot) -> Bool {
            if isTarget(s) { return true }
            var holds = false
            for child in s.children {
                if walk(child) { holds = true }
            }
            if over == nil && !holds && Self.pressable.contains(s.elementType)
                && !s.frame.isEmpty && s.frame.contains(point) {
                over = s.label.isEmpty ? "an element without a label" : s.label
            }
            return holds
        }
        _ = walk(snap)
        return over
    }

    /// Puts the keyboard away the way a person does: ✓ (Done) on the bar above it.
    func hideKeyboard() throws {
        let keyboard = app.keyboards.firstMatch
        guard keyboard.exists else { return }
        let done = app.toolbars.buttons.matching(NSPredicate(format: "label IN %@", system("done", ["Done", "Fertig"]) as NSArray)).firstMatch
        guard done.exists, done.isHittable else {
            throw StepFailure("the keyboard is in the way and has no ✓ (Done) bar to put it away")
        }
        done.tap()
        keyboardTopCache = nil
        let deadline = Date().addingTimeInterval(3)
        while keyboard.exists {
            guard Date() < deadline else { throw StepFailure("the keyboard didn't go away") }
            rest(0.2)
        }
        rest(0.5) // the sheet grows back to full height
    }

    /// A greyed-out button takes the tap and does nothing, and the run only
    /// fails steps later on something that should have appeared. Say it here.
    private func waitUntilEnabled(_ el: XCUIElement, _ seconds: Double = 2) throws {
        guard el.elementType == .button else { return }
        let deadline = Date().addingTimeInterval(seconds)
        while !el.isEnabled {
            guard Date() < deadline else {
                throw StepFailure("“\(el.label)” is greyed out – an earlier step didn't do what it should (see the screenshot)")
            }
            rest(0.2)
        }
    }

    func tap(_ el: XCUIElement) throws {
        try reach(el)
        try waitUntilEnabled(el)
        let f = el.frame, area = visibleArea()
        let middle = CGPoint(x: f.midX, y: f.midY)
        // WebKit calls an element behind the keyboard hittable; the tap would land on a key.
        if area.keyboard && !f.isEmpty && middle.y > area.rect.maxY {
            throw StepFailure("“\(el.label)” is behind the keyboard and didn't scroll above it")
        }
        if el.isHittable {
            el.tap()
        } else if !f.isEmpty && area.rect.contains(middle) {
            // WebKit sometimes calls a visible element not hittable: tap its middle.
            el.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        } else {
            throw StepFailure("can't reach “\(el.label)” on screen")
        }
    }

    func scrollIntoView(_ el: XCUIElement) throws {
        guard el.exists else { throw StepFailure("gone: \(el.label)") }
        var tries = 0
        var before: CGRect? = nil
        while tries < 8 {
            let f = el.frame, area = visibleArea(), v = area.rect
            // The last scroll didn't move it: fixed on screen (a tab, a header) or the
            // page is at its end – more scrolling won't help.
            if let before = before, before == f { return }
            let middle = CGPoint(x: f.midX, y: f.midY)
            let onScreen = v.contains(middle)
            // On screen, away from the bars: close enough, whatever WebKit says about hittability.
            // (Above a keyboard the tab bar is covered, so only a small margin is needed there.)
            let below: CGFloat = area.keyboard ? 20 : 100
            if onScreen && f.midY > v.minY + 90 && f.midY < v.maxY - below { return }
            // Near an edge (a tab, a header button): only when nothing is over it. WebKit
            // calls a row under the floating tab bar hittable, and the tap meant for
            // Reset app went to the tab bar.
            if onScreen && el.isHittable && coveringElement(el, at: middle) == nil { return }
            before = f
            let distance = abs(f.midY - v.midY) / max(v.height, 1)
            if distance > 1.3 { fling(down: f.midY > v.midY) } else { scroll(down: f.midY > v.midY, by: distance) }
            tries += 1
        }
    }

    /// Moves the page (or the open sheet) by `share` of what is visible: almost
    /// half by default, up to two thirds when the target is further away (Reset
    /// app at the end of Settings took a dozen short drags).
    func scroll(down: Bool, by share: CGFloat = 0.45) {
        let v = visible, w = window
        let s = min(max(share, 0.45), 0.68)
        // The finger starts clear of the header and the tab bar, where a drag doesn't move the page.
        let start: CGFloat = down ? 0.75 : 0.3
        let end: CGFloat = down ? start - s : start + s
        let y = { (part: CGFloat) in (v.minY + v.height * part - w.minY) / w.height }
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y(start)))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y(end)))
        // Fast, with a hold before letting go so the page stops where the finger does
        // (at the default speed one drag took ~1.8 s).
        from.press(forDuration: 0.05, thenDragTo: to, withVelocity: .fast, thenHoldForDuration: 0.15)
        rest(0.35)
    }

    /// A quick flick for a target screens away: the page coasts most of the way in
    /// one go instead of several slow drags of about 3 s each.
    func fling(down: Bool) {
        let v = visible, w = window
        let y = { (part: CGFloat) in (v.minY + v.height * part - w.minY) / w.height }
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y(down ? 0.8 : 0.25)))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y(down ? 0.1 : 0.95)))
        from.press(forDuration: 0.02, thenDragTo: to, withVelocity: .fast, thenHoldForDuration: 0)
        rest(0.8) // let it coast to a stop
    }

    /// A swipe across the whole row, like a thumb (85 % → 10 % of the width).
    func swipeAcross(_ el: XCUIElement, toLeft: Bool) {
        let w = window.width, y = el.frame.midY
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let start = origin.withOffset(CGVector(dx: toLeft ? w * 0.85 : w * 0.15, dy: y))
        let end = origin.withOffset(CGVector(dx: toLeft ? w * 0.10 : w * 0.90, dy: y))
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .fast, thenHoldForDuration: 0)
    }

    /// Whether the element is there or shows up within `seconds`. `exists` first:
    /// waitForExistence takes about a second even for what is already on screen,
    /// and the keyboard alone was waited for twice per text field.
    private func appears(_ el: XCUIElement, within seconds: Double) -> Bool {
        el.exists || el.waitForExistence(timeout: seconds)
    }

    private func waitForKeyboard(_ seconds: Double = 3) -> Bool {
        appears(app.keyboards.firstMatch, within: seconds)
    }

    /// Types the text in one go. Key by key (one typeText per character) XCTest
    /// looked for the focused field before every letter, and on the iPhone the
    /// keyboard went down and up between them – slow, and odd in the video.
    private func typeByHand(_ text: String) {
        guard !text.isEmpty else { return }
        app.typeText(text)
    }

    func typeIntoFocused(_ text: String) throws {
        guard waitForKeyboard() else { throw StepFailure("no keyboard – nothing has focus") }
        typeByHand(text)
    }

    /// Focuses the field with the caret at its end, deletes what is there, types the text
    /// in one go. `check`: for words – if autocorrection changed them, type them again.
    func replaceText(in el: XCUIElement, with text: String, check: Bool = false) throws {
        try reach(el, dx: 0.96)
        el.coordinate(withNormalizedOffset: CGVector(dx: 0.96, dy: 0.5)).tap()
        if !waitForKeyboard(2) { el.tap() }
        guard waitForKeyboard() else { throw StepFailure("the field “\(el.label)” didn't take focus") }
        let current = (el.value as? String) ?? ""
        if !current.isEmpty && current != el.placeholderValue {
            el.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 2))
        }
        typeByHand(text)
        guard check, el.exists, el.elementType != .secureTextField, let now = el.value as? String else { return }
        let typed = now.trimmingCharacters(in: .whitespaces)
        if typed.isEmpty || typed == text || now == el.placeholderValue || typed.allSatisfy({ $0 == "•" }) { return }
        log("  the keyboard turned “\(text)” into “\(typed)” – typing it again")
        el.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: max(now.count, text.count) + 4))
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
        guard appears(search, within: 10) else {
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
        guard appears(picker, within: 4) else { throw StepFailure("no date picker") }
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
        rest(0.8)
        let icon = springboard.icons[spec.iconName]
        if !spec.iconName.isEmpty && appears(icon, within: 3) && icon.isHittable {
            icon.tap()
        } else {
            log("  the \(spec.iconName) icon isn't on this home screen page – starting the app directly")
            app.activate()
        }
        _ = app.wait(for: .runningForeground, timeout: 20)
        rest(1.2)
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
        // Short pull with a hold at the end: a fling (no hold) opens Control Center
        // and carries on to its second page (connectivity), away from Screen Recording.
        let start = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.005))
        let end = springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.3))
        start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .default, thenHoldForDuration: 0.4)
        rest(0.6) // tapRecordButton waits for the page to stand still
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
        rest(0.5)
        openControlCenter()
        try tapRecordButton()
        recording = true
        // Out of Control Center at once: the 3-2-1 countdown goes on without it,
        // and the video starts on the home screen instead of in Control Center.
        XCUIDevice.shared.press(.home)
        rest(2) // the tap (it waits for the screen) and Home took the rest of the 3 s
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
