import './Navbar.css';

const Navbar = ({ onHomeClick, onMontarGradeClick }) => {
  return (
    <nav className="navbar">
      <div className="logo">
        <i className="fi fi-br-calendar logo-icon"></i>
        <span className="logo-text">Grade UFLA</span>
      </div>
      <div className="nav-links">
        <a href="#home" onClick={onHomeClick}>Home</a>
        <a href="#calendario" onClick={onMontarGradeClick}>Montar Grade</a>
      </div>
    </nav>
  );
};

export default Navbar;

