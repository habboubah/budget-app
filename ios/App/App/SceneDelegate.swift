import UIKit
import Capacitor

/// UIScene lifecycle, which apps built with the iOS 27 SDK must adopt — without
/// it UIKit refuses to launch the app (crash in
/// `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
/// Straight from Capacitor's 8.5 migration guide.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Our own bridge view controller (SpartopfShared.swift), so the app's own plugins register (plan 14).
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
