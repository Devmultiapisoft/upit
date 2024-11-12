// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project-imports
import EcommerceDataCard from 'components/cards/statistics/EcommerceDataCard';
import EcommerceDataChart from 'sections/widget/chart/EcommerceDataChart';

import RepeatCustomerRate from 'sections/widget/chart/RepeatCustomerRate';
import ProjectOverview from 'sections/widget/chart/ProjectOverview';
import ProjectRelease from 'sections/dashboard/default/ProjectRelease';
import AssignUsers from 'sections/widget/statistics/AssignUsers';

import Transactions from 'sections/widget/data/Transactions';
import TotalIncome from 'sections/widget/chart/TotalIncome';

// assets
import { AddCircle, ArrowDown, ArrowUp, Book, Calendar, CloudChange, Home3, Wallet3 } from 'iconsax-react';
import WelcomeBanner from 'sections/dashboard/default/WelcomeBanner';
import { Fab } from '@mui/material';
import axios from 'utils/axios';
import { useNavigate } from 'react-router';
import LoadingButton from 'components/@extended/LoadingButton';
import { useEffect, useState } from 'react';
import { openSnackbar } from 'api/snackbar';


// ==============================|| DASHBOARD - DEFAULT ||============================== //

export default function DashboardDefault() {
  const theme = useTheme();
  const navigate = useNavigate()

  const [loading, setLoading] = useState({})

  const reset = async (resetType) => {
    setLoading(old => { return { ...old, [`${resetType}`]: true } })
    try {
      const response = await axios.get(`/${resetType}`)
      if (response.status === 200)
        if (resetType.includes("reset-setup-db"))
          window.location.href = '/login'
        else
          openSnackbar({
            open: true,
            message: "Plans are reset successfully!",
            variant: 'alert',

            alert: {
              color: 'success'
            }
          })
      else
        openSnackbar({
          open: true,
          message: response.data?.message,
          variant: 'alert',

          alert: {
            color: 'success'
          }
        })
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(old => { return { ...old, [`${resetType}`]: false } })
    }
  }


  let crons = [
    // { title: "Assign Tokens", url: "assignTokens" },
    { title: "Reset Assign Tokens", url: "resetAssignTokens" },
    { title: "Withdraw", url: "withdrawCron" }
  ]

  const runCron = async (cronType) => {
    setLoading(old => { return { ...old, [`${cronType}`]: true } })
    try {
      const password = prompt("Enter Cron Password:", "") || null
      if (!password || password === '' || password.length === 0) return alert("Invalid Password!")
      const baseURL = process.env.VITE_APP_TEST === '1' ? process.env.VITE_APP_TEST_API_URL : process.env.VITE_APP_PROD_API_URL
      const response = await axios.post(`${baseURL}/cron/${cronType}`, { key: password })
      openSnackbar({
        open: true,
        message: response.data?.message,
        variant: 'alert',

        alert: {
          color: 'success'
        }
      })
    } catch (error) {
      openSnackbar({
        open: true,
        message: error?.message || error,
        variant: 'alert',

        alert: {
          color: 'error'
        }
      })
    } finally {
      setLoading(old => { return { ...old, [`${cronType}`]: false } })
    }
  }

  const [user, setUserData] = useState({})

  useEffect(() => {

    (async () => {
      const response = await axios.get("/get-all-users-data")
      if (response.status === 200)
        setUserData(response.data?.result)
      else
        console.log(response?.data)
    })()


  }, [])

  const generateRandomPercentage = (inputValue) => {
    const maxPercentage = inputValue ? parseInt(inputValue) : 0;
    const percentage = Math.random() * maxPercentage;
    return percentage.toFixed(2)
  }

  return (
    <Grid container rowSpacing={4.5} columnSpacing={2.75}>

      <Grid item xs={12}>
        <LoadingButton style={{ margin: "2px" }} loading={loading['reset-setup-db']} variant="contained" loadingPosition="start" startIcon={<Home3 />} onClick={() => reset("reset-setup-db")}>
          Factory Reset
        </LoadingButton>
        <LoadingButton style={{ margin: "2px" }} loading={loading['setup-db']} variant="contained" loadingPosition="start" startIcon={<Home3 />} onClick={() => reset("setup-db")}>
          Reset DB
        </LoadingButton>
      </Grid>

      <Grid item xs={12}>
        {
          crons && crons.map((cron, i) => {
            return <LoadingButton style={{ margin: "2px" }} loading={loading[`${cron.url}`]} variant="outlined" loadingPosition="start" startIcon={<Home3 />} onClick={() => runCron(cron.url)}>
              {cron.title}
            </LoadingButton>
          })
        }
      </Grid>

      {/* <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Wallet"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.wallet?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
          percentage={
            <Typography color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.wallet)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Total Wallet"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.totalIncome?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
          percentage={
            <Typography color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.totalIncome)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid> */}

      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Tasks Income"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.tasksIncome?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Level Income"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.levelIncome?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Tasks Withdrawals"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.tasksIncome_withdraw?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Level Withdrawals"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.levelIncome_withdraw?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Gas Wallet"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.gas_wallet?.toFixed(5) ?? 0)}
          iconPrimary={<Wallet3 />}
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>

      {/* <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Withdrawals"
          count={process.env.VITE_APP_CURRENCY_TYPE + ' ' + (user?.withdrawals ?? 0)}
          iconPrimary={<Wallet3 />}
          percentage={
            <Typography color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.withdrawals)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid> */}

      {/* row 1 */}
      {/* <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Wallet"
          count={user?.wallet}
          iconPrimary={<Wallet3 />}
          percentage={
            <Typography color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.wallet)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Topup Wallet"
          count={user?.wallet_topup}
          iconPrimary={<Wallet3 />}
          percentage={
            <Typography color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.wallet_topup)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.primary.main} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="ROI Bonus"
          count={user?.dailyIncome}
          color="warning"
          iconPrimary={<Book color={theme.palette.warning.dark} />}
          percentage={
            <Typography color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowDown size={16} style={{ transform: 'rotate(-45deg)' }} /> {generateRandomPercentage(user?.dailyIncome)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.warning.dark} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Direct Bonus"
          count={user?.directIncome}
          color="warning"
          iconPrimary={<Book color={theme.palette.warning.dark} />}
          percentage={
            <Typography color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowDown size={16} style={{ transform: 'rotate(-45deg)' }} /> {generateRandomPercentage(user?.directIncome)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.warning.dark} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Matching Bonus"
          count={user?.matchingIncome}
          color="warning"
          iconPrimary={<Book color={theme.palette.warning.dark} />}
          percentage={
            <Typography color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowDown size={16} style={{ transform: 'rotate(-45deg)' }} /> {generateRandomPercentage(user?.matchingIncome)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.warning.dark} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="VIP Bonus"
          count={user?.vipIncome}
          color="warning"
          iconPrimary={<Book color={theme.palette.warning.dark} />}
          percentage={
            <Typography color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowDown size={16} style={{ transform: 'rotate(-45deg)' }} /> {generateRandomPercentage(user?.vipIncome)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.warning.dark} />
        </EcommerceDataCard>
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Deposits"
          count={user?.deposits}
          color="success"
          iconPrimary={<Calendar color={theme.palette.success.darker} />}
          percentage={
            <Typography color="success.darker" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowUp size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.deposits)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.success.darker} />
        </EcommerceDataCard>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <EcommerceDataCard
          title="Withdrawals"
          count={user?.withdrawals}
          color="error"
          iconPrimary={<CloudChange color={theme.palette.error.dark} />}
          percentage={
            <Typography color="error.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowDown size={16} style={{ transform: 'rotate(45deg)' }} /> {generateRandomPercentage(user?.withdrawals)}%
            </Typography>
          }
        >
          <EcommerceDataChart color={theme.palette.error.dark} />
        </EcommerceDataCard>
      </Grid> */}

    </Grid>
  );
}
