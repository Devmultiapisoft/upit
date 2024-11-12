import CommonDatatable from 'helpers/CommonDatatable'
import { useMemo, useState } from 'react';
import { Button, Chip } from '@mui/material';
import LoadingButton from 'components/@extended/LoadingButton';
import { Home3 } from 'iconsax-react';
import { openSnackbar } from 'api/snackbar';
import axiosServices from 'utils/axios';
import Loader from 'components/Loader';

export default function WithdrawalReports() {

    const withdrawalType = process.env.VITE_APP_WITHDRAWAL_TYPE

    const [loading, setLoading] = useState({
        APPROVED: false,
        REJECTED: false
    })

    const updateStatus = async (id, remark, status) => {
        try {
            setLoading({ ...loading, [remark]: true })
            // triggering
            const response = await axiosServices.put('/update-withdrawal/', { id, remark, status });
            if (response.status === 200) {
                openSnackbar({
                    open: true,
                    message: 'Status Updated Successfully',
                    variant: 'alert',

                    alert: {
                        color: 'success'
                    }
                })
            }
        } catch (error) {
            openSnackbar({
                open: true,
                message: error?.message || 'Something went wrong !!!',
                variant: 'alert',

                alert: {
                    color: 'error'
                }
            })
        } finally {
            setLoading({
                ...loading,
                [remark]: false
            })
        }
    }

    const apiPoint = 'get-all-withdrawals'

    const columns = useMemo(
        () => [
            {
                header: 'User ID',
                accessorKey: 'user_id'
            },
            {
                header: 'Wallet Type',
                accessorKey: 'extra.walletType'
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
                    return  <Chip color={props.getValue() === 2 ? "success" : "error"} size="small" label={props?.row?.original?.remark} />
                    // return withdrawalType && props.getValue() === 0
                    //     ?
                    //     <>
                    //         <LoadingButton onClick={() => updateStatus(props?.row?.original._id, "APPROVED", 2)} style={{ margin: "2px" }} type="submit" loading={loading?.APPROVED} variant="contained" loadingPosition="start" startIcon={<Home3 />}>
                    //             Approve
                    //         </LoadingButton>
                    //         <LoadingButton onClick={() => updateStatus(props?.row?.original._id, "REJECTED", 1)} style={{ margin: "2px" }} type="submit" loading={loading?.REJECTED} variant="contained" loadingPosition="start" startIcon={<Home3 />}>
                    //             Reject
                    //         </LoadingButton>
                    //     </>
                    //     : <Chip color={props.getValue() === 2 ? "success" : "error"} size="small" label={props?.row?.original?.remark} />
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
    );

    return loading?.APPROVED || loading?.REJECTED ? <Loader /> : <CommonDatatable columns={columns} apiPoint={apiPoint} type={1} />
}