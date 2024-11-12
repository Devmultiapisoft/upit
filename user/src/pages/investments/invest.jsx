/**
 * Pass a axios function to the component to act when clicked the button with the amount
 * Show a toast for every response
 */

import { useState, Fragment, useEffect, useReducer } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project-imports
import MainCard from 'components/MainCard';
import { InfoCircle } from 'iconsax-react';
import axios from 'utils/axios';
import { TextField } from '@mui/material';
import { openSnackbar } from 'api/snackbar';
import AnimateButton from 'components/@extended/AnimateButton';
import Loader from 'components/Loader';

// ==============================|| PRICING ||============================== //

import Handler from 'myComponents/requests';

export default function Pricing() {
  const theme = useTheme();
  const [timePeriod, setTimePeriod] = useState(true);

  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState({});

  const priceListDisable = {
    opacity: 0.4,
    textDecoration: 'line-through'
  };

  const priceActivePlan = {
    padding: 3,
    borderRadius: 1,
    bgcolor: theme.palette.primary.lighter
  };
  const price = {
    fontSize: '40px',
    fontWeight: 700,
    lineHeight: 1
  };

  const [state, setState] = useState(false);

  const investInPlan = async (id, amount) => {
    await Handler({
      url: `/add-investment`,
      data: { investment_plan_id: id },
      setState
    }).then(() => {
      setUser((old) => {
        return { ...old, wallet_topup: old.wallet_topup - amount };
      })
    }).catch((e) => console.log(e))
  };

  useEffect(() => {
    let user = JSON.parse(window.localStorage.getItem('user'));
    if (user) setUser(user);
  }, [])

  useEffect(() => {
    const fetchPlans = async () => {
      const res = await axios.get(`/get-all-investment-plans`);
      if (res.data?.status) setPlans(res.data?.result);
    };
    fetchPlans();
  }, []);

  return (
    <>
      {state ? (
        <Loader />
      ) : (
        <Grid container spacing={3}>
          {/* <Grid item xs={12}>
          <Alert
            color="warning"
            variant="border"
            icon={<InfoCircle variant="Bold" />}
            sx={{ '&.MuiAlert-colorWarning': { backgroundColor: alpha(theme.palette.warning.lighter, 0.15) } }}
          >
            <AlertTitle sx={{ fontWeight: 500, color: 'warning.dark' }}>Note</AlertTitle>
            <Typography variant="h6">
              The pricing provided is for demonstration purposes only. For actual product pricing, please refer to the official
              <Link
                color="warning.dark"
                sx={{ textDecoration: 'none', ml: 0.5 }}
                variant="subtitle1"
                target="_blank"
                href="https://themeforest.net/item/able-pro-react-mui-admin-dashboard-template/50427053?s_rank=4"
              >
                pricing page
              </Link>
            </Typography>
          </Alert>
        </Grid> */}
          <Grid item xs={12}>
            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between">
              <Stack spacing={0}>
                <Typography variant="h5">
                  Funds: {process.env.VITE_APP_CURRENCY_TYPE}
                  {user?.wallet_topup ?? 0}
                </Typography>
                {/* <Typography color="text.secondary">It makes no difference what the price is, it all makes senses to us.</Typography> */}
              </Stack>
              {/* <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="subtitle1" color={timePeriod ? 'text.secondary' : 'text.primary'}>
                Billed Yearly
              </Typography>
              <Switch checked={timePeriod} onChange={() => setTimePeriod(!timePeriod)} inputProps={{ 'aria-label': 'container' }} />
              <Typography variant="subtitle1" color={timePeriod ? 'text.primary' : 'text.secondary'}>
                Billed Monthly
              </Typography>
            </Stack> */}
            </Stack>
          </Grid>
          <Grid item container spacing={3} xs={12} alignItems="center">
            {plans.map((plan, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <MainCard>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Box sx={plan.active ? priceActivePlan : { padding: 3 }}>
                        <Grid container spacing={3}>
                          {plan.active && (
                            <Grid item xs={12} sx={{ textAlign: 'center' }}>
                              <Chip label="Popular" color="success" />
                            </Grid>
                          )}
                          <Grid item xs={12}>
                            <Stack spacing={0} textAlign="center">
                              <Typography variant="h4">{plan.title}</Typography>
                              <Typography>{plan.description}</Typography>
                            </Stack>
                          </Grid>
                          <Grid item xs={12}>
                            <Stack spacing={0} alignItems="center">
                              {timePeriod && (
                                <Typography variant="h2" sx={price}>
                                  {process.env.VITE_APP_CURRENCY_TYPE}
                                  {plan.amount_from === plan.amount_to ? plan.amount_from : `${plan.amount_from}-${plan.amount_to}`}
                                </Typography>
                              )}
                              {/* {!timePeriod && (
                              <Typography variant="h2" sx={price}>
                                ${plan.price * 12 - 99}
                              </Typography>
                            )}
                            <Typography variant="h6" color="text.secondary">
                              Lifetime
                            </Typography> */}
                            </Stack>
                          </Grid>
                          <Grid item xs={12}>
                            {/* <TextField id="outlined-basic" label="Amount" sx={{ mb: 2, width: '100%' }} /> */}
                            {/* <Button
                            onClick={() => investInPlan(plan.id)}
                            color={plan.active ? 'primary' : 'secondary'}
                            variant={plan.active ? 'contained' : 'outlined'}
                            fullWidth
                          >
                            Invest
                          </Button> */}
                            <AnimateButton>
                              <Button
                                onClick={() => investInPlan(plan.id, plan.amount_from)}
                                disableElevation
                                disabled={state}
                                fullWidth
                                size="large"
                                type="submit"
                                variant="outlined"
                                color="secondary"
                              >
                                Invest
                              </Button>
                            </AnimateButton>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <List
                        sx={{
                          m: 0,
                          p: 0,
                          '&> li': {
                            px: 0,
                            py: 0
                          }
                        }}
                        component="ul"
                      >
                        <Fragment>
                          <ListItem>
                            <ListItemText primary={`Period: ${plan.days}`} sx={{ textAlign: 'center' }} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary={`ROI Percentage: ${plan.percentage}%`} sx={{ textAlign: 'center' }} />
                          </ListItem>
                        </Fragment>
                      </List>
                    </Grid>
                  </Grid>
                </MainCard>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </>
  );
}
