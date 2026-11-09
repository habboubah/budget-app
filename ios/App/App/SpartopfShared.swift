import Foundation
import Capacitor
import StoreKit
import WidgetKit

/// Plan 14: the app's own bridge view controller, so it can register our own
/// plugins. SceneDelegate makes it the window's root; the UIScene setup is
/// otherwise unchanged (CLAUDE.md, "Native iOS").
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SpartopfSharedPlugin())
    }
}

/// Plan 14: what widgets, Siri, Shortcuts and the Watch share with the app,
/// through the App Group `group.com.habboubah.spartopf`:
///
/// - `snapshot.json` — the summary the app writes (src/native/snapshot.ts),
///   never the whole book, and without amounts unless the user allows them.
/// - `inbox/<id>.json` — items extensions leave for the app to book
///   (src/native/inbox.ts); deleted once the app has taken them in.
///
/// Our own code, no third-party plugin: it handles financial data. Files are
/// written with `completeUntilFirstUserAuthentication`, because widgets and
/// intents run while the phone is locked. JSON goes through as text; the app
/// checks every field (the inbox's writers run outside the app).
@objc(SpartopfSharedPlugin)
public class SpartopfSharedPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpartopfSharedPlugin"
    public let jsName = "SpartopfShared"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "writeSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readInbox", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeInbox", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "system", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.habboubah.spartopf"
    /// Size caps: a snapshot, one inbox item, and how many items one read returns.
    static let maxSnapshotBytes = 256 * 1024
    static let maxItemBytes = 64 * 1024
    static let maxItems = 500

    private var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup)
    }
    private var snapshotURL: URL? { container?.appendingPathComponent("snapshot.json") }
    private var inboxURL: URL? { container?.appendingPathComponent("inbox", isDirectory: true) }

    /// An inbox item's id is its file name: ASCII letters, digits, - and _ (no path tricks).
    static func isValidId(_ id: String) -> Bool {
        !id.isEmpty && id.count <= 64 && id.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") }
    }

    /// Writes the snapshot atomically, then asks WidgetKit to reload every widget.
    @objc func writeSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8), data.count <= Self.maxSnapshotBytes else {
            call.reject("No snapshot to write")
            return
        }
        guard let url = snapshotURL else {
            call.reject("The App Group is not available")
            return
        }
        do {
            try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("The snapshot could not be written")
        }
    }

    /// The snapshot as written (the debug round trip in Sichern und übertragen); null when there is none.
    @objc func readSnapshot(_ call: CAPPluginCall) {
        guard let url = snapshotURL,
              let data = try? Data(contentsOf: url),
              data.count <= Self.maxSnapshotBytes,
              let json = String(data: data, encoding: .utf8) else {
            call.resolve(["json": NSNull()])
            return
        }
        call.resolve(["json": json])
    }

    /// Every item in the inbox as `{ id, json }`, oldest name first. A file too big to read comes back
    /// with empty JSON, so the app can drop it by its id.
    @objc func readInbox(_ call: CAPPluginCall) {
        let fm = FileManager.default
        guard let dir = inboxURL, let names = try? fm.contentsOfDirectory(atPath: dir.path) else {
            call.resolve(["items": JSArray()])
            return
        }
        var items = JSArray()
        for name in names.sorted() where name.hasSuffix(".json") {
            let id = String(name.dropLast(5))
            guard Self.isValidId(id) else { continue }
            if items.count >= Self.maxItems { break }
            let url = dir.appendingPathComponent(name)
            let size = ((try? fm.attributesOfItem(atPath: url.path))?[.size] as? NSNumber)?.intValue ?? 0
            let text = size <= Self.maxItemBytes ? ((try? String(contentsOf: url, encoding: .utf8)) ?? "") : ""
            let item: JSObject = ["id": id, "json": text]
            items.append(item)
        }
        call.resolve(["items": items])
    }

    /// Deletes the items the app has taken in.
    @objc func removeInbox(_ call: CAPPluginCall) {
        guard let dir = inboxURL else {
            call.resolve()
            return
        }
        for id in call.getArray("ids", String.self) ?? [] where Self.isValidId(id) {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent("\(id).json"))
        }
        call.resolve()
    }

    /// Plan 15: Apple's own rating prompt, on the active window scene. iOS decides whether it shows
    /// (at most three times a year; never in TestFlight builds). The app's rule for when to ask is
    /// `shouldAskForReview` in src/logic.ts.
    @objc func requestReview(_ call: CAPPluginCall) {
        Task { @MainActor in
            let scene = UIApplication.shared.connectedScenes
                .first { $0.activationState == .foregroundActive } as? UIWindowScene
            if let scene {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            call.resolve()
        }
    }

    /// Hosts `open` may hand to iOS (Optionen › Über Spartopf, src/links.ts); mail goes to Mail.
    static let openHosts: Set<String> = ["apps.apple.com", "habboubah.github.io"]

    /// Plan 15: opens a link outside the app — the App Store, Safari or Mail. Only https links to
    /// the hosts above and mailto: links; anything else is refused.
    @objc func open(_ call: CAPPluginCall) {
        guard let text = call.getString("url"), let url = URL(string: text), let scheme = url.scheme?.lowercased(),
              scheme == "mailto" || (scheme == "https" && Self.openHosts.contains(url.host?.lowercased() ?? "")) else {
            call.reject("This link isn't opened")
            return
        }
        Task { @MainActor in
            UIApplication.shared.open(url) { opened in
                if opened { call.resolve() } else { call.reject("Nothing opened the link") }
            }
        }
    }

    /// Plan 15: the system's name and version for the feedback mail ("iOS", "18.1").
    @objc func system(_ call: CAPPluginCall) {
        Task { @MainActor in
            call.resolve(["name": UIDevice.current.systemName, "version": UIDevice.current.systemVersion])
        }
    }

    /// "Alle Daten löschen": the snapshot and the inbox go too (storage.ts `onWipe`).
    @objc func clear(_ call: CAPPluginCall) {
        if let url = snapshotURL { try? FileManager.default.removeItem(at: url) }
        if let dir = inboxURL { try? FileManager.default.removeItem(at: dir) }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
