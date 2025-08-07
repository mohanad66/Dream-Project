import Form from "../../Components/Form/Form";

export default function Login({ onLogin }) {
  return (
    <div className="login-page">
      <Form 
        route="/api/token/" 
        method="login" 
        onLogin={onLogin} 
        successRedirect="/"
      />
    </div>
  );
}