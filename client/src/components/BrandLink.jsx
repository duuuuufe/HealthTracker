import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BrandLink({ className = 'dash-logo', iconClassName = '' }) {
  const { user } = useAuth();
  const location = useLocation();
  const target = user ? '/dashboard' : '/';

  const handleClick = (e) => {
    if (location.pathname === target) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Link to={target} className={className} onClick={handleClick}>
      <span className={iconClassName}>&#10084;</span> HealthSimplify
    </Link>
  );
}
