import Capacitor
import WebKit

class BridgeViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.limitsNavigationsToAppBoundDomains = false
        configuration.defaultWebpagePreferences.preferredContentMode = .mobile
        configuration.websiteDataStore = WKWebsiteDataStore.default()
        return configuration
    }
}
