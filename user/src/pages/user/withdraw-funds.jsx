import { Button, Chip, Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography, useTheme } from '@mui/material';
import CommonDatatable from 'helpers/CommonDatatable'
import { useEffect, useMemo, useState } from 'react'
import { openSnackbar } from 'api/snackbar';
import axios from 'utils/axios';
import Handler from 'myComponents/requests';
import Loader from 'components/Loader';

export default function AddFunds() {

    const [isMobileDevice, setIsMobileDevice] = useState(false);

    const handleResize = () => {
        setIsMobileDevice(window.innerWidth <= 768); // You can adjust the width as needed
    }

    const apiPoint = 'get-all-withdrawals'

    const columns = useMemo(
        () => [
            {
                header: 'Address',
                accessorKey: 'address'
            },
            {
                header: 'Wallet Type',
                accessorKey: 'extra.walletType',
                cell: (props) => {
                    return props.getValue() ?? ''
                },
            },
            {
                header: 'USDT Amount',
                accessorKey: 'amount'
            },
            {
                header: 'Tokens',
                accessorKey: 'net_amount',
                cell: (props) => {
                    return props.getValue()?.toFixed(5) ?? 0
                },
            },
            {
                header: 'Coversion Rate',
                accessorKey: 'rate',
                cell: (props) => {
                    return props.getValue()?.toFixed(5) ?? 0
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                enableColumnFilter: false,
                enableGrouping: false,
                cell: (props) => {
                    return <Chip color={props.getValue() === 2 ? "success" : "error"} label={props?.row?.original.remark} size="small" />
                },
            },
            {
                header: 'Date',
                accessorKey: 'created_at',
                // meta: { className: 'cell-right' }
                cell: (props) => {
                    return new Date(props.getValue()).toLocaleString();
                },
                enableColumnFilter: false,
                enableGrouping: false
            },
            // {
            //     header: 'TXN',
            //     accessorKey: 'txid',
            //     cell: (props) => {
            //         return <Chip color={props.getValue() !== null ? "success" : "error"} label={"Open Transaction"} size="small" onClick={() => window.open(`https://${process.env.VITE_APP_BLOCK_SCAN_URL}/tx/${props.getValue()}`, '_blank')} />
            //     }
            // }
        ],
        []
    )

    const [amount, setAmount] = useState()
    const [address, setAddress] = useState()
    const [walletType, setWalletType] = useState('tasksIncome')

    const [user, setUser] = useState()
    const [tasksIncome, setTasksIncome] = useState()
    const [levelIncome, setLevelIncome] = useState()

    const [state, setState] = useState(false);

    useEffect(() => {
        let user = JSON.parse(window.localStorage.getItem('user'));
        if (user) {
            setUser(user)
            setTasksIncome(user?.extra?.tasksIncome)
            setLevelIncome(user?.extra?.levelIncome)
        }
    }, [])

    const handleTXN = async () => {
        try {

            if (!amount || amount <= 0) throw "Invalid amount!"
            if (amount > user[`${walletType}`]) throw "Amount must be less or equal than your balance!"
            if (!address || address.length <= 26) throw "Invalid address!"

            // HARDCODED: withdrawalGasMinimumAmount
            if(user.extra?.gas_wallet < 2) throw "You don't have enough gas amount in your gas wallet to proceed with the withdrawal!"

            await Handler({
                url: `/add-withdrawal`,
                data: {
                    amount,
                    address,
                    walletType
                },
                setState
            }).then(() => {
                setAmount('')
                setAddress('')
                switch(walletType){
                    case 'tasksIncome':
                        setTasksIncome(old => old - parseFloat(amount))
                        break;
                    case 'levelIncome':
                        setLevelIncome(old => old - parseFloat(amount))
                        break;
                    default: 
                        console.log("Something went wrong...")
                }
                // setUser((old) => {
                    // console.log(old.extra[`${walletType}`], parseFloat(amount))
                    // return { ...old, [`extra.${walletType}`]: old.extra[`${walletType}`] - parseFloat(amount) }
                // })
            }).catch((e) => console.log(e));

        } catch (e) {
            // console.log(e)
            openSnackbar({
                open: true,
                message: e,
                variant: 'alert',

                alert: {
                    color: 'error'
                }
            })
        }
    }



    return state ? (
        <Loader />
    ) : (
        <>
            <Stack sx={{ pb: 3 }}>
                <Typography variant="subtitle1">
                    Tasks Balance: {process.env.VITE_APP_CURRENCY_TYPE}{tasksIncome ?? 0}
                    <br />
                    Level Balance: {process.env.VITE_APP_CURRENCY_TYPE}{levelIncome ?? 0}
                </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={isMobileDevice ? 12 : 1.25} sx={{ pb: 3 }}>
                <Stack>
                    <Select
                        fullWidth
                        id="wallet-type"
                        value={walletType}
                        onChange={(e) => setWalletType(e.target.value)}
                        autoFocus
                    >
                        <MenuItem key={1} value="tasksIncome">Tasks Wallet</MenuItem>
                        <MenuItem key={2} value="levelIncome">Level Wallet</MenuItem>
                    </Select>

                </Stack>
                <Stack>
                    <TextField
                        fullWidth
                        id="personal-amount"
                        value={amount}
                        onChange={(e) => { setAmount(e.target.value) }}
                        placeholder="Enter Amount"
                        autoFocus
                    />
                </Stack>
                <Stack>
                    <TextField
                        fullWidth
                        id="personal-address"
                        value={address}
                        onChange={(e) => { setAddress(e.target.value) }}
                        placeholder="Enter Address"
                        autoFocus
                    />
                </Stack>
                <Stack spacing={10}>
                    <Button variant="contained" onClick={handleTXN}>
                        Withdraw
                    </Button>
                </Stack>
            </Stack>

            <CommonDatatable columns={columns} apiPoint={apiPoint} type={1} />

        </>
    )
}