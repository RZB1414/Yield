import './Menu.css'
import ThemeToggle from '../ThemeToggle';
import { useNavigate } from "react-router-dom"
import { ReactComponent as AddIcon } from '../../assets/icons/add-circle-icon.svg'
import { ReactComponent as LogoutIcon } from '../../assets/icons/logout.svg'

const Menu = ({setIsLoggedIn}) => {

    const navigate = useNavigate()

    return (
        <div className='stocks-container-header'>
            <h2 onClick={() => navigate('/')}>
                Stocks
            </h2>
            <h2 onClick={() => navigate('/dividends')}>
                Dividends
            </h2>
            <h2 onClick={() => navigate('/info')}>
                Info
            </h2>
            <h2 onClick={() => navigate('/add')}>
                <AddIcon className='add-icon' />
            </h2>
            <LogoutIcon className='logout' onClick={() => {
                sessionStorage.setItem('userId', '')
                setIsLoggedIn(false)
                navigate('/')
             }}>
                Logout
            </LogoutIcon>
            <ThemeToggle />
        </div>
    )
}

export default Menu