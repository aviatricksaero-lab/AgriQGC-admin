import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function DocumentManagement() {
  const [privacyFile, setPrivacyFile] = useState(null);
  const [termsFile, setTermsFile] = useState(null);
  const [privacyDoc, setPrivacyDoc] = useState(null);
  const [termsDoc, setTermsDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ privacy: 0, terms: 0 });
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const fetchDocuments = async () => {
    try {
      const [privacyRes, termsRes] = await Promise.all([
        axios.get(`${API_URL}/document/privacy`).catch(err => {
          if (err.response?.status === 404) return { data: { document: null } };
          throw err;
        }),
        axios.get(`${API_URL}/document/terms`).catch(err => {
          if (err.response?.status === 404) return { data: { document: null } };
          throw err;
        })
      ]);

      setPrivacyDoc(privacyRes.data.document || null);
      setTermsDoc(termsRes.data.document || null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      if (err.code === 'ERR_NETWORK') {
        showNotification('Cannot connect to server. Please make sure the backend is running.', 'error');
      }
    }
  };

  const uploadDocument = async (type, file) => {
    if (!file) {
      showNotification('Please select a PDF file', 'error');
      return;
    }

    if (file.type !== 'application/pdf') {
      showNotification('Please select a valid PDF file', 'error');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("type", type);

      await axios.post(`${API_URL}/document/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({ ...prev, [type]: percentCompleted }));
        }
      });

      await fetchDocuments();
      
      if (type === "privacy") {
        setPrivacyFile(null);
        document.getElementById('privacy-file').value = '';
      } else {
        setTermsFile(null);
        document.getElementById('terms-file').value = '';
      }
      
      showNotification(`${type} document uploaded successfully!`, 'success');
    } catch (err) {
      console.error("Upload error:", err);
      let errorMsg = `Error uploading ${type} document`;
      if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Cannot connect to server. Please make sure the backend is running.';
      } else if (err.response?.status === 404) {
        errorMsg = 'Upload endpoint not found. Please check your backend configuration.';
      }
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    }
  };

  const deleteDocument = async (type) => {
    if (!window.confirm(`Are you sure you want to delete the ${type} document?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/document/${type}`);
      await fetchDocuments();
      showNotification(`${type} document deleted successfully!`, 'success');
    } catch (err) {
      console.error("Delete error:", err);
      let errorMsg = `Error deleting ${type} document`;
      if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Cannot connect to server. Please make sure the backend is running.';
      }
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return '';
    return `${API_URL}/uploads/${filePath}`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>📄 Document Management</h1>
          <p style={styles.headerSubtitle}>Manage privacy policy and terms & conditions documents</p>
        </div>
      </div>

      {/* Notification */}
      {notification.message && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'error' ? '#dc3545' : '#28a745'
        }}>
          <span style={styles.notificationIcon}>
            {notification.type === 'error' ? '❌' : '✅'}
          </span>
          {notification.message}
        </div>
      )}

      {/* PRIVACY POLICY */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleWrapper}>
            <span style={styles.cardIcon}>🔒</span>
            <h3 style={styles.cardTitle}>Privacy Policy</h3>
          </div>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: privacyDoc ? '#28a745' : '#ffc107',
            color: privacyDoc ? 'white' : '#333'
          }}>
            {privacyDoc ? '✅ Uploaded' : '⚠️ Not Uploaded'}
          </span>
        </div>

        <div style={styles.fileInputWrapper}>
          <input
            type="file"
            accept=".pdf"
            id="privacy-file"
            style={styles.fileInput}
            onChange={(e) => setPrivacyFile(e.target.files[0])}
            disabled={loading}
          />
          <label htmlFor="privacy-file" style={styles.fileInputLabel}>
            <span style={styles.fileIcon}>📎</span>
            {privacyFile ? privacyFile.name : 'Choose PDF file'}
          </label>
        </div>

        {uploadProgress.privacy > 0 && uploadProgress.privacy < 100 && (
          <div style={styles.progressContainer}>
            <div style={{
              ...styles.progressBar,
              width: `${uploadProgress.privacy}%`
            }} />
            <span style={styles.progressText}>{uploadProgress.privacy}%</span>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.uploadBtn,
              opacity: !privacyFile || loading ? 0.6 : 1
            }}
            disabled={!privacyFile || loading}
            onClick={() => uploadDocument("privacy", privacyFile)}
          >
            {loading ? '⏳ Uploading...' : '📤 Upload'}
          </button>

          {privacyDoc && (
            <>
              <a
                style={styles.viewBtn}
                href={getFileUrl(privacyDoc.filePath)}
                target="_blank"
                rel="noreferrer"
              >
                👁️ View PDF
              </a>

              <button
                style={styles.deleteBtn}
                onClick={() => deleteDocument("privacy")}
                disabled={loading}
              >
                🗑️ Delete
              </button>

              <span style={styles.fileInfo}>
                📅 {new Date(privacyDoc.uploadedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        {privacyDoc && (
          <div style={styles.fileDetails}>
            <span style={styles.fileDetailIcon}>📁</span>
            {privacyDoc.fileName}
          </div>
        )}
      </div>

      {/* TERMS & CONDITIONS */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleWrapper}>
            <span style={styles.cardIcon}>📋</span>
            <h3 style={styles.cardTitle}>Terms & Conditions</h3>
          </div>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: termsDoc ? '#28a745' : '#ffc107',
            color: termsDoc ? 'white' : '#333'
          }}>
            {termsDoc ? '✅ Uploaded' : '⚠️ Not Uploaded'}
          </span>
        </div>

        <div style={styles.fileInputWrapper}>
          <input
            type="file"
            accept=".pdf"
            id="terms-file"
            style={styles.fileInput}
            onChange={(e) => setTermsFile(e.target.files[0])}
            disabled={loading}
          />
          <label htmlFor="terms-file" style={styles.fileInputLabel}>
            <span style={styles.fileIcon}>📎</span>
            {termsFile ? termsFile.name : 'Choose PDF file'}
          </label>
        </div>

        {uploadProgress.terms > 0 && uploadProgress.terms < 100 && (
          <div style={styles.progressContainer}>
            <div style={{
              ...styles.progressBar,
              width: `${uploadProgress.terms}%`
            }} />
            <span style={styles.progressText}>{uploadProgress.terms}%</span>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.uploadBtn,
              opacity: !termsFile || loading ? 0.6 : 1
            }}
            disabled={!termsFile || loading}
            onClick={() => uploadDocument("terms", termsFile)}
          >
            {loading ? '⏳ Uploading...' : '📤 Upload'}
          </button>

          {termsDoc && (
            <>
              <a
                style={styles.viewBtn}
                href={getFileUrl(termsDoc.filePath)}
                target="_blank"
                rel="noreferrer"
              >
                👁️ View PDF
              </a>

              <button
                style={styles.deleteBtn}
                onClick={() => deleteDocument("terms")}
                disabled={loading}
              >
                🗑️ Delete
              </button>

              <span style={styles.fileInfo}>
                📅 {new Date(termsDoc.uploadedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        {termsDoc && (
          <div style={styles.fileDetails}>
            <span style={styles.fileDetailIcon}>📁</span>
            {termsDoc.fileName}
          </div>
        )}
      </div>
    </div>
  );
}

// Dark Theme Styles - Matching QGC Admin Dashboard
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#0a0e17",
    minHeight: "100vh",
    color: "#e0e0e0"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    padding: "20px 24px",
    background: "linear-gradient(135deg, #0d1b2a 0%, #1a1a2e 100%)",
    borderRadius: "12px",
    border: "1px solid #1e2d45",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)"
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: "-0.5px"
  },
  headerSubtitle: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    color: "#8899bb",
    fontWeight: "400"
  },
  notification: {
    color: "white",
    padding: "14px 20px",
    borderRadius: "10px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
  },
  notificationIcon: {
    fontSize: "18px"
  },
  card: {
    background: "linear-gradient(135deg, #0d1b2a 0%, #1a1a2e 100%)",
    padding: "28px",
    borderRadius: "12px",
    marginBottom: "24px",
    border: "1px solid #1e2d45",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    transition: "all 0.3s ease"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #1e2d45"
  },
  cardTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  cardIcon: {
    fontSize: "24px"
  },
  cardTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "600"
  },
  statusBadge: {
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.3px",
    textTransform: "uppercase"
  },
  fileInputWrapper: {
    marginBottom: "16px"
  },
  fileInput: {
    display: "none"
  },
  fileInputLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 20px",
    background: "#0d1b2a",
    color: "#8899bb",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "2px dashed #1e2d45",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "14px",
    fontWeight: "400"
  },
  fileIcon: {
    fontSize: "18px"
  },
  buttonRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  uploadBtn: {
    padding: "10px 28px",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
  },
  viewBtn: {
    padding: "10px 28px",
    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
    display: "inline-block"
  },
  deleteBtn: {
    padding: "10px 28px",
    background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)"
  },
  fileInfo: {
    marginLeft: "auto",
    color: "#667799",
    fontSize: "13px",
    fontWeight: "400"
  },
  fileDetails: {
    marginTop: "16px",
    padding: "12px 16px",
    background: "#0d1b2a",
    borderRadius: "8px",
    color: "#8899bb",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid #1e2d45"
  },
  fileDetailIcon: {
    fontSize: "16px"
  },
  progressContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "#0d1b2a",
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "12px",
    position: "relative"
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)",
    transition: "width 0.3s ease",
    borderRadius: "3px"
  },
  progressText: {
    position: "absolute",
    top: "50%",
    right: "8px",
    transform: "translateY(-50%)",
    fontSize: "10px",
    fontWeight: "600",
    color: "#667799"
  }
};

// Hover effects for buttons
const buttonHoverStyles = `
  .upload-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4); }
  .view-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4); }
  .delete-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4); }
`;

// Add hover styles to document
const styleElement = document.createElement('style');
styleElement.textContent = buttonHoverStyles;
document.head.appendChild(styleElement);