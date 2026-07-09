import Capacitor
import WebKit

/// Custom bridge view controller. Capacitor's CAPBridgeViewController loads
/// the configured server URL in an in-app WKWebView — navigation must stay
/// internal via server.allowNavigation in capacitor.config.ts.
class BridgeViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.limitsNavigationsToAppBoundDomains = true
        return configuration
    }
}
