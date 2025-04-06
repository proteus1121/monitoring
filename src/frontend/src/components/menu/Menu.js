import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaCogs, FaUsers } from 'react-icons/fa';
import './Menu.css';

const Menu = () => {
    return (
        <nav className="vertical-menu">
            <ul>
                <li><Link to="/dashboard"><FaHome /> Main</Link></li>
                <li><Link to="/devices"><FaCogs /> Devices</Link></li>
                <li><Link to="/users"><FaUsers /> Users</Link></li>
            </ul>
        </nav>
    );
};

export default Menu;