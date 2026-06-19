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
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: notification.type === 'error' ? '#991b1b' : '#065f46'
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
            backgroundColor: privacyDoc ? '#10b981' : '#f59e0b',
            color: 'white'
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
            backgroundColor: termsDoc ? '#10b981' : '#f59e0b',
            color: 'white'
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

// White Theme Styles - Clean & Modern
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    color: "#1e293b"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    padding: "24px 28px",
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px"
  },
  headerSubtitle: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "400"
  },
  notification: {
    padding: "14px 20px",
    borderRadius: "10px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
    border: "1px solid rgba(0,0,0,0.06)"
  },
  notificationIcon: {
    fontSize: "18px"
  },
  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "16px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
    transition: "all 0.2s ease"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9"
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
    color: "#0f172a",
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
    background: "#f8fafc",
    color: "#64748b",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "2px dashed #e2e8f0",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "14px",
    fontWeight: "400",
    '&:hover': {
      borderColor: '#4f46e5',
      background: '#f1f5f9'
    }
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
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(79, 70, 229, 0.3)'
    }
  },
  viewBtn: {
    padding: "10px 28px",
    background: "#10b981",
    color: "white",
    textDecoration: "none",
    borderRadius: "10px",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
    display: "inline-block",
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)'
    }
  },
  deleteBtn: {
    padding: "10px 28px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)'
    }
  },
  fileInfo: {
    marginLeft: "auto",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "400"
  },
  fileDetails: {
    marginTop: "16px",
    padding: "12px 16px",
    background: "#f8fafc",
    borderRadius: "10px",
    color: "#64748b",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid #f1f5f9"
  },
  fileDetailIcon: {
    fontSize: "16px"
  },
  progressContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "#f1f5f9",
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
    color: "#94a3b8"
  }
};