import { useState } from "react";
import { formatAddress } from "../utils/contract";

function Navbar({
  account,
  activeMode,
  onSelectMode,
  onConnectWallet,
  onChangeAccount,
  onDisconnectWallet
}) {
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);

  function handleWalletAction(action) {
    setIsWalletMenuOpen(false);
    action();
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <span className="navbar-brand fw-semibold">Donation on Chain</span>

        <div className="btn-group ms-lg-3 my-2 my-lg-0" role="group" aria-label="Select portal">
          <button
            className={`btn btn-sm ${activeMode === "user" ? "btn-light" : "btn-outline-light"}`}
            type="button"
            onClick={() => onSelectMode("user")}
          >
            User
          </button>
          <button
            className={`btn btn-sm ${activeMode === "admin" ? "btn-light" : "btn-outline-light"}`}
            type="button"
            onClick={() => onSelectMode("admin")}
          >
            Admin
          </button>
        </div>

        <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
          {account && <span className="text-white-50 small">Account</span>}
          <div className="dropdown">
            <button
              className="btn btn-primary btn-sm dropdown-toggle"
              type="button"
              aria-expanded={isWalletMenuOpen}
              onClick={() => setIsWalletMenuOpen((isOpen) => !isOpen)}
            >
              {account ? formatAddress(account) : "Connect Wallet"}
            </button>
            <ul className={`dropdown-menu dropdown-menu-end ${isWalletMenuOpen ? "show" : ""}`}>
              {!account && (
                <li>
                  <button className="dropdown-item" type="button" onClick={() => handleWalletAction(onConnectWallet)}>
                    Connect Wallet
                  </button>
                </li>
              )}

              {account && (
                <>
                  <li>
                    <button className="dropdown-item" type="button" onClick={() => handleWalletAction(onChangeAccount)}>
                      Change Account
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-danger" type="button" onClick={() => handleWalletAction(onDisconnectWallet)}>
                      Disconnect Wallet
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
