import Capacitor

class BridgeViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.limitsNavigationsToAppBoundDomains = false
        configuration.defaultWebpagePreferences.preferredContentMode = .mobile
        return configuration
    }
}
