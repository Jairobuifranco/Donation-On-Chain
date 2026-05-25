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
    <nav className="navbar navbar-expand-lg app-navbar">
      <div className="container">
        <span className="navbar-brand fw-semibold d-inline-flex align-items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}coin-icon.svg`}
            alt=""
            width="28"
            height="28"
            aria-hidden="true"
          />
          Donation on Chain
        </span>

        <div className="btn-group role-switcher ms-lg-3 my-2 my-lg-0" role="group" aria-label="Select portal">
          <button
            className={`btn btn-sm ${activeMode === "user" ? "btn-light shadow-sm" : "btn-outline-light"}`}
            type="button"
            onClick={() => onSelectMode("user")}
          >
            <i className="bi bi-people-fill me-1" aria-hidden="true"></i>
            User
          </button>
          <button
            className={`btn btn-sm ${activeMode === "admin" ? "btn-light shadow-sm" : "btn-outline-light"}`}
            type="button"
            onClick={() => onSelectMode("admin")}
          >
            <i className="bi bi-shield-check me-1" aria-hidden="true"></i>
            Admin
          </button>
        </div>

        <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
          {account && <span className="text-white-50 small">Account</span>}
          <div className="dropdown">
            <button
              className="btn btn-wallet btn-sm dropdown-toggle"
              type="button"
              aria-expanded={isWalletMenuOpen}
              onClick={() => setIsWalletMenuOpen((isOpen) => !isOpen)}
            >
              <i className="bi bi-wallet2 me-1" aria-hidden="true"></i>
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
