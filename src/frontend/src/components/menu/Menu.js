import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {FaHome, FaCogs, FaUsers, FaBars} from 'react-icons/fa';
import './Menu.css';
import Logo from "../logo/Logo";

const Menu = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (<>
            <div className="navbar">
                <FaBars className="burger-button" onClick={toggleMenu}/>
                <Logo /><div className="title">Smart Sensor Network</div>
            </div>

            <nav className={`vertical-menu ${isOpen ? 'open' : ''}`}>
                <ul>
                    <li><Link to="/dashboard" onClick={toggleMenu}><FaHome/><span> Main</span></Link></li>
                    <li><Link to="/devices" onClick={toggleMenu}><FaCogs/><span>Devices</span></Link></li>
                    <li><Link to="/users" onClick={toggleMenu}><FaUsers/><span>Users</span></Link></li>
                </ul>
            </nav>
        </>);
};

export default Menu;
