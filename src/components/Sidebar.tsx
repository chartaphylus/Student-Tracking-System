import { NavLink } from 'react-router-dom';
import { Users, Edit3, BookOpen, FileText, LogOut, Tags } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Pesantren Rabbaanii</h2>
                <p>Sistem Tracking Santri</p>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/data-santri"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Users size={18} />
                    <span>Data Santri</span>
                </NavLink>

                <NavLink
                    to="/data-referensi"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Tags size={18} />
                    <span>Data Master/Ref</span>
                </NavLink>

                <NavLink
                    to="/input-adab-ibadah"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Edit3 size={18} />
                    <span>Input Rekaman Kegiatan</span>
                </NavLink>

                <NavLink
                    to="/data-adab-ibadah"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <BookOpen size={18} />
                    <span>Kategori & Kegiatan</span>
                </NavLink>

                <NavLink
                    to="/laporan-bulanan"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <FileText size={18} />
                    <span>Laporan Bulanan</span>
                </NavLink>
            </nav>

            <div className="logout-wrapper" style={{ padding: '1rem' }}>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="nav-item"
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
