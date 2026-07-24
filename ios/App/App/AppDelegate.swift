import UIKit
import Capacitor
import SafariServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var safariVC: SFSafariViewController?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        self.window?.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1.0)

        UIView.setAnimationsEnabled(false)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            UIView.setAnimationsEnabled(true)
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "brickvalue" {
            safariVC?.dismiss(animated: true)
            safariVC = nil
            NotificationCenter.default.post(
                name: NSNotification.Name("CAPNotificationOpenURL"),
                object: nil,
                userInfo: ["url": url]
            )
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
