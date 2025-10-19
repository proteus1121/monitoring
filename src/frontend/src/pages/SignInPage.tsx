const SignInPage = () => {
  const handleLogin = async () => {
    const username = "Artem";
    const password = "123";
    try {
      const response = await fetch(`https://api.ssn.pp.ua/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Store session in cookies
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.message };
      }
    } catch (error) {
      return {
        success: false,
        message: "An error occurred. Please try again.",
      };
    }
  };

  return (
    <div>
      SignInPage <button onClick={handleLogin}>login</button>
    </div>
  );
};

export default SignInPage;
