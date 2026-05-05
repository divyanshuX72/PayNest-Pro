<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PayNest Pro — Sign In</title>
  <meta name="description" content="Sign in to your PayNest Pro workspace."/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/assets/css/login.css"/>
</head>

<body>

  <main class="login-container">
    <header class="login-header">
      <div class="login-logo">
        <span class="material-symbols-outlined">payments</span>
      </div>
      <h1 class="login-title">Atiq Payroll</h1>
      <p class="login-subtitle">Sign in to manage your workspace</p>
    </header>

    <form class="login-form" action="/login" method="POST">
      
      <div class="form-group">
        <div class="form-label-wrapper">
          <label for="email" class="form-label">Email Address</label>
        </div>
        <div class="input-wrapper">
          <span class="material-symbols-outlined input-icon">mail</span>
          <input type="email" id="email" name="email" class="form-input" placeholder="name@company.com" required autocomplete="email" autofocus>
        </div>
      </div>

      <div class="form-group">
        <div class="form-label-wrapper">
          <label for="password" class="form-label">Password</label>
          <a href="/forgot-password" class="forgot-link">Forgot Password?</a>
        </div>
        <div class="input-wrapper">
          <span class="material-symbols-outlined input-icon">lock</span>
          <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
        </div>
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="remember" name="remember" class="form-checkbox">
        <label for="remember" class="checkbox-label">Remember me for 30 days</label>
      </div>

      <button type="submit" class="btn-submit">
        Sign In
        <span class="material-symbols-outlined">arrow_forward</span>
      </button>

    </form>

    <footer class="login-footer">
      <p>Having trouble? <a href="/support" class="support-link">Contact IT Support</a></p>
    </footer>
  </main>

</body>
</html>
