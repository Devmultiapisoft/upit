import { Button, Chip, Grid, InputLabel, Stack, TextField } from '@mui/material';
import CommonDatatable from 'helpers/CommonDatatable'
import { useEffect, useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract } from "wagmi"
import { openSnackbar } from 'api/snackbar';
import { Link } from 'react-router-dom';
import { parseEther } from 'viem';
import Handler from 'myComponents/requests';
import Loader from 'components/Loader';

export default function AddFunds() {

    const apiPoint = 'get-all-deposits'

    const columns = useMemo(
        () => [
            {
                header: 'TXN',
                accessorKey: 'txid',
                cell: (props) => {
                    return <Chip color={props.getValue() !== null ? "success" : "error"} label={"Open Transaction"} size="small" onClick={() => window.open(`https://${process.env.VITE_APP_BLOCK_SCAN_URL}/tx/${props.getValue()}`, '_blank')} />
                }
            },
            {
                header: 'Address',
                accessorKey: 'address'
            },
            {
                header: 'BNB',
                accessorKey: 'amount'
            },
            {
                header: 'in USDT',
                accessorKey: 'amount_coin',
                case: (props) => {
                    return props?.row?.original.status === 2 ? props.getValue() : ''
                }
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => {
                    return <Chip color={props.getValue() === 2 ? "success" : "error"} label={props.getValue() === 2 ? "APPROVED" : "PENDING"} size="small" />
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
            }
        ],
        []
    )

    const [amount, setAmount] = useState()
    const { writeContract, data, error, write, isError, isLoading, isIdle } = useWriteContract()
    const { address } = useAccount()

    const [state, setState] = useState(false)

    // TODO
    // Fetch the live price
    // Put it into one state
    // and put a if statement 


    useEffect(() => {
        if (data !== undefined)

            (async () => await Handler({
                url: `/add-deposit`,
                data: {
                    amount,
                    address,
                    txid: data
                },
                setState
            }))()

    }, [data])

    useEffect(() => {
        if (error !== null) {
            console.log(JSON.stringify(error))
            openSnackbar({
                open: true,
                message: "Trasaction Failed!",
                variant: 'alert',

                alert: {
                    color: 'error'
                }
            })
        }
    }, [error])

    const handleTXN = () => {
        try {

            // TODO: replace the state
            if (!amount || amount < 0 || amount < 0.00001) throw "Invalid amount !"

            writeContract({
                abi: JSON.parse(process.env.VITE_APP_DEPOSIT_CONTRACT_ABI),
                address: process.env.VITE_APP_DEPOSIT_CONTRACT_ADDRESS,
                functionName: process.env.VITE_APP_DEPOSIT_FUNC_NAME,
                args: [
                    BigInt(amount * 10 ** 18)
                ],
                value: parseEther(amount.toString())
            })

        } catch (e) {
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
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ pb: 3 }}>
                {
                    address
                        ?
                        <>
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
                            <Stack spacing={10}>
                                <Button disabled={isLoading} variant="contained" onClick={handleTXN}>
                                    Add BNB
                                    {/* Add {process.env.VITE_APP_COIN_NAME} */}
                                </Button>
                            </Stack>
                        </>
                        : <ConnectButton />
                }
            </Stack>

            {
                data !== null && data !== undefined
                    ?
                    <Stack spacing={1.25} sx={{ pb: 3 }}>
                        <h3>Transaction Successful, Amount will be assigned to your wallet once verified!</h3>
                        <Chip color={"success"} sx={{ width: "250px" }} label={"Check Transaction Status Here"} size="small" onClick={() => window.open(`https://${process.env.VITE_APP_BLOCK_SCAN_URL}/tx/${data}`, '_blank')} />
                    </Stack>
                    : ""
            }

            <CommonDatatable columns={columns} apiPoint={apiPoint} type={1} />
        </>
    )
}