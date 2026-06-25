import type { RecordingScreenshotScene } from "@/lib/workspace/types";

type RecordingScreenshotMockProps = {
  scene: RecordingScreenshotScene;
  appName: string;
  windowTitle: string;
  highlight?: boolean;
};

export function RecordingScreenshotMock({
  scene,
  appName,
  windowTitle,
  highlight,
}: RecordingScreenshotMockProps) {
  return (
    <div
      className={`recording-mock ${highlight ? "recording-mock--highlight" : ""}`}
    >
      <div className="recording-mock__titlebar">
        <div className="recording-mock__traffic">
          <span />
          <span />
          <span />
        </div>
        <span className="recording-mock__app">{appName}</span>
        <span className="recording-mock__title">{windowTitle}</span>
      </div>
      <div className="recording-mock__body">{renderScene(scene)}</div>
    </div>
  );
}

function renderScene(scene: RecordingScreenshotScene) {
  switch (scene) {
    case "crm-list":
      return (
        <div className="recording-mock-scene recording-mock-scene--crm">
          <div className="recording-mock-sidebar">
            <div className="recording-mock-sidebar__item recording-mock-sidebar__item--active" />
            <div className="recording-mock-sidebar__item" />
            <div className="recording-mock-sidebar__item" />
          </div>
          <div className="recording-mock-main">
            <div className="recording-mock-toolbar">
              <span className="recording-mock-pill">Accounts</span>
              <span className="recording-mock-pill recording-mock-pill--muted">
                Q2 pipeline
              </span>
              <span className="recording-mock-btn">Export</span>
            </div>
            <div className="recording-mock-table">
              {["Acme Corp", "Northwind LLC", "Globex Inc", "Initech"].map(
                (row) => (
                  <div key={row} className="recording-mock-table__row">
                    <span className="recording-mock-table__cell recording-mock-table__cell--wide" />
                    <span className="recording-mock-table__cell" />
                    <span className="recording-mock-table__cell recording-mock-table__cell--label">
                      {row}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    case "crm-export-dialog":
      return (
        <div className="recording-mock-scene recording-mock-scene--dialog">
          <div className="recording-mock-dialog">
            <p className="recording-mock-dialog__title">Export accounts</p>
            <p className="recording-mock-dialog__desc">
              248 rows · All columns · CSV format
            </p>
            <div className="recording-mock-dialog__options">
              <span className="recording-mock-check recording-mock-check--on" />
              Include related contacts
              <span className="recording-mock-check recording-mock-check--on" />
              Include custom fields
            </div>
            <div className="recording-mock-dialog__actions">
              <span className="recording-mock-btn recording-mock-btn--ghost">
                Cancel
              </span>
              <span className="recording-mock-btn">Export CSV</span>
            </div>
          </div>
        </div>
      );
    case "spreadsheet-raw":
      return (
        <div className="recording-mock-scene recording-mock-scene--sheet">
          <div className="recording-mock-sheet-tabs">
            <span className="recording-mock-sheet-tab recording-mock-sheet-tab--active">
              Q2_export_raw
            </span>
            <span className="recording-mock-sheet-tab">Sheet2</span>
          </div>
          <div className="recording-mock-grid">
            {["A", "B", "C", "D", "E"].map((col) => (
              <span key={col} className="recording-mock-grid__head">
                {col}
              </span>
            ))}
            {Array.from({ length: 8 }).map((_, row) => (
              <div key={row} className="recording-mock-grid__row">
                {Array.from({ length: 5 }).map((__, col) => (
                  <span
                    key={col}
                    className={`recording-mock-grid__cell ${
                      col === 3 ? "recording-mock-grid__cell--dup" : ""
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "spreadsheet-clean":
      return (
        <div className="recording-mock-scene recording-mock-scene--sheet">
          <div className="recording-mock-sheet-tabs">
            <span className="recording-mock-sheet-tab recording-mock-sheet-tab--active">
              Q2_export_clean
            </span>
          </div>
          <div className="recording-mock-grid">
            {["Account", "Owner", "Amount", "Stage"].map((col) => (
              <span key={col} className="recording-mock-grid__head">
                {col}
              </span>
            ))}
            {Array.from({ length: 6 }).map((_, row) => (
              <div key={row} className="recording-mock-grid__row">
                {Array.from({ length: 4 }).map((__, col) => (
                  <span key={col} className="recording-mock-grid__cell" />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "stripe-dashboard":
      return (
        <div className="recording-mock-scene recording-mock-scene--stripe">
          <div className="recording-mock-stripe-header">Payouts</div>
          <div className="recording-mock-stripe-stats">
            <div className="recording-mock-stripe-stat" />
            <div className="recording-mock-stripe-stat" />
            <div className="recording-mock-stripe-stat" />
          </div>
          <div className="recording-mock-table">
            {["po_1abc", "po_2def", "po_3ghi"].map((row) => (
              <div key={row} className="recording-mock-table__row">
                <span className="recording-mock-table__cell recording-mock-table__cell--label">
                  {row}
                </span>
                <span className="recording-mock-table__cell" />
                <span className="recording-mock-table__cell" />
              </div>
            ))}
          </div>
        </div>
      );
    case "zendesk-ticket":
      return (
        <div className="recording-mock-scene recording-mock-scene--zendesk">
          <div className="recording-mock-zd-main">
            <p className="recording-mock-zd-subject">Billing inquiry — refund request</p>
            <div className="recording-mock-zd-body">
              <span />
              <span />
              <span className="recording-mock-zd-body__short" />
            </div>
          </div>
          <div className="recording-mock-zd-sidebar">
            <p className="recording-mock-zd-label">Customer</p>
            <span />
            <p className="recording-mock-zd-label">Plan</p>
            <span />
          </div>
        </div>
      );
    case "terminal":
      return (
        <div className="recording-mock-scene recording-mock-scene--terminal">
          <p>
            <span className="recording-mock-term-prompt">$</span> ./scripts/deploy-staging.sh
          </p>
          <p className="recording-mock-term-dim">→ Building assets…</p>
          <p className="recording-mock-term-dim">→ Running migrations…</p>
          <p>
            <span className="recording-mock-term-ok">✓</span> Deployed to staging
          </p>
          <p className="recording-mock-term-cursor">_</p>
        </div>
      );
    case "browser-tabs":
      return (
        <div className="recording-mock-scene recording-mock-scene--browser">
          <div className="recording-mock-browser-tabs">
            <span className="recording-mock-browser-tab recording-mock-browser-tab--active">
              Staging / health
            </span>
            <span className="recording-mock-browser-tab">Staging / checkout</span>
            <span className="recording-mock-browser-tab">Staging / admin</span>
          </div>
          <div className="recording-mock-browser-content">
            <span />
            <span />
            <span className="recording-mock-browser-content__block" />
          </div>
        </div>
      );
    default:
      return null;
  }
}
