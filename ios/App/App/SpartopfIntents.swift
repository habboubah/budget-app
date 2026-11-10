import AppIntents
import Foundation

// Plan 18: Siri and Shortcuts. Everything runs on the device, through what the
// app shares in the App Group (SpartopfShared.swift):
//
// - "Eintrag hinzufügen" leaves an inbox item (`source: "siri"`). The app books
//   it at launch or on resume through the bank import's path — the user's
//   names and rules, an open entry ticked off instead of doubled — with one
//   undo (src/native/inbox.ts).
// - "Was bleibt am Monatsende?" and "Offene Rechnungen" read `amounts.json`,
//   which the app writes only while its lock is off and which iOS keeps
//   readable only while the phone is unlocked; both ask for the phone to be
//   unlocked first (`authenticationPolicy`).
// - The categories come from `snapshot.json`, named in the app's language.
//
// iOS lists the actions in Siri, Spotlight and the Shortcuts app by itself
// (`SpartopfShortcuts`); nothing to set up. Texts: Localizable.strings and
// AppShortcuts.strings in de.lproj and ar.lproj (English is in the code).

@available(iOS 16.0, *)
enum SharedFiles {
    static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: SpartopfSharedPlugin.appGroup)
    }

    static func json(_ name: String) -> [String: Any]? {
        guard let url = container?.appendingPathComponent(name),
              let data = try? Data(contentsOf: url),
              data.count <= SpartopfSharedPlugin.maxSnapshotBytes,
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return object
    }

    static var snapshot: [String: Any]? { json("snapshot.json") }

    /// Siri's amounts, when the app wrote them for the running month (a new month: open the app once).
    static var amounts: [String: Any]? {
        guard let a = json("amounts.json"), (a["month"] as? String) == monthKey(Date()) else { return nil }
        // A month that starts on payday ends inside a calendar month (plan 32).
        if let until = a["until"] as? String, isoDay(Date()) > until { return nil }
        return a
    }

    /// Leaves an item for the app to book; its id is its file name.
    static func addToInbox(_ item: [String: Any], id: String) throws {
        guard let dir = container?.appendingPathComponent("inbox", isDirectory: true) else { throw SpartopfIntentError.unavailable }
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let data = try JSONSerialization.data(withJSONObject: item)
        try data.write(to: dir.appendingPathComponent("\(id).json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    /// Cents as money in the app's currency and locale ("12,50 €").
    static func money(_ cents: Int, _ source: [String: Any]?) -> String {
        let format = NumberFormatter()
        format.numberStyle = .currency
        if let locale = source?["locale"] as? String { format.locale = Locale(identifier: locale) }
        format.currencyCode = (source?["currency"] as? String) ?? "EUR"
        return format.string(from: NSNumber(value: Double(cents) / 100)) ?? String(format: "%.2f", Double(cents) / 100)
    }

    static func cents(_ value: Any?) -> Int? { (value as? NSNumber)?.intValue }

    private static func formatter(_ pattern: String) -> DateFormatter {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = pattern
        return f
    }
    static func monthKey(_ date: Date) -> String { formatter("yyyy-MM").string(from: date) }
    static func isoDay(_ date: Date) -> String { formatter("yyyy-MM-dd").string(from: date) }
}

@available(iOS 16.0, *)
enum SpartopfIntentError: Error, CustomLocalizedStringResourceConvertible {
    case unavailable
    case badAmount

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .unavailable: return "Spartopf can’t be reached right now."
        case .badAmount: return "That amount can’t be booked."
        }
    }
}

/// A category, as the app names it (from the snapshot).
@available(iOS 16.0, *)
struct CategoryEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Category"
    static var defaultQuery = CategoryQuery()

    let id: String
    let name: String
    let emoji: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: "\(emoji)")
    }
}

@available(iOS 16.0, *)
struct CategoryQuery: EntityStringQuery {
    func entities(for identifiers: [CategoryEntity.ID]) async throws -> [CategoryEntity] {
        all().filter { identifiers.contains($0.id) }
    }

    func entities(matching string: String) async throws -> [CategoryEntity] {
        let wanted = string.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
        return all().filter { $0.name.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil).contains(wanted) }
    }

    func suggestedEntities() async throws -> [CategoryEntity] { all() }

    private func all() -> [CategoryEntity] {
        let list = SharedFiles.snapshot?["categories"] as? [[String: Any]] ?? []
        return list.compactMap { c in
            guard let id = c["id"] as? String, SpartopfSharedPlugin.isValidId(id), let name = c["name"] as? String else { return nil }
            return CategoryEntity(id: id, name: name, emoji: c["emoji"] as? String ?? "")
        }
    }
}

/// "Ausgabe in Spartopf": an amount, and if wanted a name, a category, a day, open instead of paid.
@available(iOS 16.0, *)
struct AddEntryIntent: AppIntent {
    static var title: LocalizedStringResource = "Add entry"
    static var description = IntentDescription("Books an expense or an income in Spartopf.")
    static var openAppWhenRun = false

    @Parameter(title: "Amount", requestValueDialog: IntentDialog("How much?"))
    var amount: IntentCurrencyAmount

    @Parameter(title: "Name", requestValueDialog: IntentDialog("What for?"))
    var name: String?

    @Parameter(title: "Category")
    var category: CategoryEntity?

    @Parameter(title: "Date")
    var date: Date?

    @Parameter(title: "Paid", default: true)
    var paid: Bool

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\.$amount) for \(\.$name)") {
            \.$category
            \.$date
            \.$paid
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Booked in the book's own currency, whatever was said.
        let value = NSDecimalNumber(decimal: amount.amount).doubleValue * 100
        guard value.isFinite, value >= 1, value <= 10_000_000_000 else { throw SpartopfIntentError.badAmount }
        let cents = Int(value.rounded())
        let id = "siri-" + UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        var item: [String: Any] = ["source": "siri", "createdAt": Int(Date().timeIntervalSince1970 * 1000), "amount": cents]
        let said = (name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !said.isEmpty { item["name"] = String(said.prefix(80)) }
        if let category { item["categoryId"] = category.id }
        if let date { item["date"] = SharedFiles.isoDay(date) }
        if !paid { item["paid"] = false }
        try SharedFiles.addToInbox(item, id: id)

        let money = SharedFiles.money(cents, SharedFiles.snapshot)
        let what = said.isEmpty ? (category?.name ?? "") : said
        let dialog: IntentDialog = paid ? "Booked: \(money) \(what)" : "Booked as open: \(money) \(what)"
        return .result(dialog: dialog)
    }
}

/// "Was bleibt am Monatsende?" — the running month's end-of-month balance, and what is in the account now.
@available(iOS 16.0, *)
struct MonthEndIntent: AppIntent {
    static var title: LocalizedStringResource = "What’s left at the end of the month?"
    static var description = IntentDescription("Says what Spartopf expects in your account at the end of the month.")
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let a = SharedFiles.amounts, let end = SharedFiles.cents(a["end"]), let now = SharedFiles.cents(a["now"]) else {
            return .result(dialog: "Open Spartopf to see it.")
        }
        let atEnd = SharedFiles.money(end, a)
        let inAccount = SharedFiles.money(now, a)
        return .result(dialog: "At the end of the month: \(atEnd). In your account now: \(inAccount).")
    }
}

/// "Offene Rechnungen" — the next open bills, overdue first, with their amounts.
@available(iOS 16.0, *)
struct OpenBillsIntent: AppIntent {
    static var title: LocalizedStringResource = "Open bills"
    static var description = IntentDescription("Says which of this month’s bills are still open in Spartopf.")
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let a = SharedFiles.amounts else {
            return .result(dialog: "Open Spartopf to see it.")
        }
        let bills = a["bills"] as? [[String: Any]] ?? []
        guard !bills.isEmpty else {
            return .result(dialog: "No bills are open this month.")
        }
        let list = bills.prefix(3).map { bill -> String in
            let name = bill["name"] as? String ?? ""
            guard let cents = SharedFiles.cents(bill["amount"]) else { return name }
            return "\(name) \(SharedFiles.money(cents, a))"
        }.joined(separator: ", ")
        let open = SharedFiles.cents(a["open"]) ?? bills.count
        let count = String(open)
        return .result(dialog: "Open: \(count). Next: \(list).")
    }
}

/// The phrases Siri and Spotlight know. Each names the app; German and Arabic are in AppShortcuts.strings.
@available(iOS 16.0, *)
struct SpartopfShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: AddEntryIntent(), phrases: [
            "Add an expense in \(.applicationName)",
            "New entry in \(.applicationName)",
            "Book in \(.applicationName)"
        ])
        AppShortcut(intent: MonthEndIntent(), phrases: [
            "What’s left at the end of the month in \(.applicationName)",
            "Month end in \(.applicationName)"
        ])
        AppShortcut(intent: OpenBillsIntent(), phrases: [
            "Open bills in \(.applicationName)",
            "What’s still open in \(.applicationName)"
        ])
    }
}
