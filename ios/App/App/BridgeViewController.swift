import Capacitor
import SafariServices
import WebKit

/// Presents Clerk/OAuth auth in SFSafariViewController instead of external Safari.
final class AuthSafariNavigationMediator: NSObject, WKNavigationDelegate, WKUIDelegate {
    private weak var inner: WebViewDelegationHandler?
    private weak var viewController: UIViewController?
    private var safariVC: SFSafariViewController?

    init(inner: WebViewDelegationHandler, viewController: UIViewController) {
        self.inner = inner
        self.viewController = viewController
    }

    private func shouldOpenInSafariVC(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        if url.scheme == "brickvalue" { return false }

        let authHosts = [
            "appleid.apple.com",
            "accounts.google.com",
            "googleapis.com",
            "clerk.brickvalue.app",
            "accounts.brickvalue.app",
            "accounts.clerk.com",
            "clerk.com",
            "clerk.accounts.dev",
        ]

        return authHosts.contains { host == $0 || host.hasSuffix(".\($0)") }
    }

    private func presentSafari(url: URL) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let viewController = self.viewController else { return }
            if self.safariVC != nil { return }

            let safari = SFSafariViewController(url: url)
            safari.delegate = self
            safari.preferredControlTintColor = UIColor(red: 0.96, green: 0.62, blue: 0.04, alpha: 1.0)
            safari.modalPresentationStyle = .pageSheet
            self.safariVC = safari

            if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
                appDelegate.safariVC = safari
            }

            viewController.present(safari, animated: true)
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let isTopLevel = navigationAction.targetFrame == nil
            || navigationAction.targetFrame?.isMainFrame == true

        if let url = navigationAction.request.url,
           isTopLevel,
           shouldOpenInSafariVC(url) {
            presentSafari(url: url)
            decisionHandler(.cancel)
            return
        }

        inner?.webView(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        inner?.webView(webView, didStartProvisionalNavigation: navigation)
    }

    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        inner?.webView(
            webView,
            requestMediaCapturePermissionFor: origin,
            initiatedByFrame: frame,
            type: type,
            decisionHandler: decisionHandler
        )
    }

    func webView(
        _ webView: WKWebView,
        requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        inner?.webView(
            webView,
            requestDeviceOrientationAndMotionPermissionFor: origin,
            initiatedByFrame: frame,
            decisionHandler: decisionHandler
        )
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        inner?.webView(webView, didFinish: navigation)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        inner?.webView(webView, didFail: navigation, withError: error)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        inner?.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        inner?.webViewWebContentProcessDidTerminate(webView)
    }

    func webView(
        _ webView: WKWebView,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping @MainActor (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        inner?.webView(webView, didReceive: challenge, completionHandler: completionHandler)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url, shouldOpenInSafariVC(url) {
            presentSafari(url: url)
            return nil
        }
        return inner?.webView(
            webView,
            createWebViewWith: configuration,
            for: navigationAction,
            windowFeatures: windowFeatures
        )
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        inner?.webView(
            webView,
            runJavaScriptAlertPanelWithMessage: message,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        )
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        inner?.webView(
            webView,
            runJavaScriptConfirmPanelWithMessage: message,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        )
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        inner?.webView(
            webView,
            runJavaScriptTextInputPanelWithPrompt: prompt,
            defaultText: defaultText,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        )
    }
}

extension AuthSafariNavigationMediator: SFSafariViewControllerDelegate {
    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        safariVC = nil
        if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            appDelegate.safariVC = nil
        }
    }
}

/// Custom bridge view controller — keeps auth in SFSafariViewController, not external Safari.
class BridgeViewController: CAPBridgeViewController {
    private var authNavigationMediator: AuthSafariNavigationMediator?

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.limitsNavigationsToAppBoundDomains = false
        configuration.defaultWebpagePreferences.preferredContentMode = .mobile
        return configuration
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        guard let capBridge = bridge as? CapacitorBridge,
              let webView = webView else { return }

        let mediator = AuthSafariNavigationMediator(inner: capBridge.webViewDelegationHandler, viewController: self)
        authNavigationMediator = mediator
        webView.navigationDelegate = mediator
        webView.uiDelegate = mediator
    }
}
