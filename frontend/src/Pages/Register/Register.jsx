import Form from "../../Components/Form/Form";

export default function Register() {
  return (
    <div className="login-page">
      {/* Animated background particles */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Register Form */}
      <Form 
        route="/api/token/" 
        method="register" 
        successRedirect="/"
      />
    </div>
  );
}