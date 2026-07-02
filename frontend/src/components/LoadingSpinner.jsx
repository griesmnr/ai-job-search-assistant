export default function LoadingSpinner({ message }) {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <span>{message}</span>
    </div>
  );
}