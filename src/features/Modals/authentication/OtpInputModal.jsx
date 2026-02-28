import React, { useEffect } from "react";
import OtpInput from "../../../components/OtpInput/OtpInput";
import { X } from "lucide-react";

const OtpInputModal = (props) => {
  const { onVerify, handleClose } = props;

  useEffect(() => {
    document.body.classList.add("fed-modal-open");
    return () => {
      document.body.classList.remove("fed-modal-open");
    };
  }, []);

  return (
    <div className="fed-modal-root">
      <div
        className="fed-modal-overlay"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        onClick={handleClose}
      >
        <div
          className="fed-modal-surface"
          style={{ width: "min(520px, 92vw)", position: "relative" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "0.6rem",
              right: "0.6rem",
              zIndex: 10,
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              borderRadius: "8px",
              padding: "0.35rem",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X />
          </button>
          <OtpInput
            isSignUp={true}
            onHandleVerfiy={onVerify}
            handleClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
};

export default OtpInputModal;
