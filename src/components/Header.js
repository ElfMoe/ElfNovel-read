import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function Header(props) {
  return (
    <nav className={`navbar navbar-expand-lg ${props.darkMode ? "navbar-dark bg-dark" : "navbar-light bg-light"}`}>
      <div className="container">
        <Link className="navbar-brand" to="/">小说发布平台</Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">首页</Link>
            </li>
          </ul>

          <button 
            className="btn btn-outline-primary"
            onClick={() => props.setDarkMode(!props.darkMode)}
          >
            {props.darkMode ? "浅色模式" : "深色模式"}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
