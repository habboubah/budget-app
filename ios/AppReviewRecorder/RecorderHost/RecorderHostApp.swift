import SwiftUI

/// Only there because a UI test needs an app to belong to. The test itself
/// drives the installed Haushaltsbuch Einfach (by bundle id), not this app.
@main
struct RecorderHostApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Haushaltsbuch Einfach recorder\nRun the UI test, not this app.")
                .multilineTextAlignment(.center)
                .padding()
        }
    }
}
