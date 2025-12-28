import { Link } from 'react-router-dom';

/**
 * Global navigation component.
 */
const Navbar = () => {
    return (
        <nav
            className='flex justify-between items-center px-8 py-4 bg-navbar text-primary shadow-md transition-colors duration-500 ease-in-out'>
            <div className='text-2xl font-bold tracking-tight'>
                P2P Game Host
            </div>
            <ul className='flex gap-6 list-none m-0'>
                <li>
                    <Link
                        to='/world'
                        className='text-muted hover:text-primary font-medium no-underline transition-colors'
                    >
                        World
                    </Link>
                </li>
                <li>
                    <a
                        href='https://github.com/your-username/your-repo'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-muted hover:text-primary font-medium no-underline transition-colors'
                    >
                        About
                    </a>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
