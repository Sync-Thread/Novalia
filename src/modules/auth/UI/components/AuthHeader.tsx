// src/app/auth/components/AuthHeader.tsx

import logo from '../../../../shared/assets/icons/logo.svg';

export default function AuthHeader(){
  return (
    <header className="auth-header">
      <div className="auth-header__bar">
        <img src={logo} alt="Novalia" width={24} height={24} />
        <span>Novalia</span>
      </div>
    </header>
  );
}
