import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        protectBookFiles()
        return true
    }

    /// Plan 06: App.entitlements gives every new file iOS Data Protection class
    /// Complete — unreadable while the phone is locked. Files written before
    /// that keep the class they were made with, so the book's two folders
    /// (Library/spartopf, and Library/NoCloud/spartopf when it is kept out of
    /// backups) are brought up to it at launch, when the phone is unlocked. A
    /// debug build logs each file's class: plan 06's check on a device.
    private func protectBookFiles() {
        let fm = FileManager.default
        guard let library = fm.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        for folder in [library.appendingPathComponent("spartopf"), library.appendingPathComponent("NoCloud/spartopf")] {
            guard fm.fileExists(atPath: folder.path) else { continue }
            var urls = [folder]
            if let inside = fm.enumerator(at: folder, includingPropertiesForKeys: nil) {
                for case let url as URL in inside { urls.append(url) }
            }
            for url in urls {
                try? fm.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
                #if DEBUG
                let protection = (try? fm.attributesOfItem(atPath: url.path))?[.protectionKey] as? FileProtectionType
                print("[Spartopf] \(url.path.replacingOccurrences(of: library.path, with: "Library")): \(protection?.rawValue ?? "unknown")")
                #endif
            }
        }
    }

    // UIScene lifecycle (required from the iOS 27 SDK): every window scene is
    // handled by SceneDelegate. See SceneDelegate.swift.
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
