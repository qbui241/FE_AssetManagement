import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './ui';

const ConfirmContext = createContext(null);

// Dung: const confirm = useConfirm();
//       if (!(await confirm({ message: 'Xoá ?', danger: true }))) return;
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog({
          title: 'Xác nhận',
          confirmText: 'Xác nhận',
          cancelText: 'Huỷ',
          danger: false,
          ...options,
        });
      }),
    []
  );

  const close = (result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title}
          onClose={() => close(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => close(false)}>
                {dialog.cancelText}
              </button>
              <button
                type="button"
                autoFocus
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmText}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, lineHeight: 1.5 }}>{dialog.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm phải nằm trong ConfirmProvider');
  return confirm;
}
