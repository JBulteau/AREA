import React, { Component } from 'react';

import { connect } from 'react-redux';

import { withStyles, createStyles, Theme } from "@material-ui/core";

import { Link } from 'react-router-dom';
import NavigationBar from "../NavigationBar";
import OrDivider from "../utils/OrDivider";
import Translator from "../utils/Translator";

import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import GoogleIcon from "../icons/GoogleIcon";
import TwitterIcon from '@material-ui/icons/Twitter';
import { setToken } from "../../actions/api.action";
import MuiAlert from "@material-ui/lab/Alert/Alert";
import Snackbar from "@material-ui/core/Snackbar";

import Cookies from "universal-cookie";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Dialog from "@material-ui/core/Dialog";

import AuthButton from "../AuthButton";

const cookies = new Cookies();

const mapStateToProps = (state: any) => {
    return { api_url: state.api_url, token: state.token };
};

function mapDispatchToProps(dispatch: any) {
    return { setToken: (token: object) => dispatch(setToken(token)) };
}

function Alert(props: any) {
    return <MuiAlert id='alert' elevation={6} variant="filled" {...props} />;
}

interface Props {
    classes: {
        field: string,
        loginButton: string,
        imageButton: string
    },
    api_url: string,
    setToken: any,
    history: {
        push: any
    },
    token: string
}

interface State {
    email: string,
    password: string,
    error: string,
    errorMessage: string,
    fakey: string,
    faopen: boolean,
    tmptoken: string
}

const styles = (theme: Theme) => createStyles({
    field: {
        marginTop: '20px'
    },
    loginButton: {
        marginTop: '20px',
    },
    imageButton: {
        backgroundColor: '#FFFFFF',
        fontSize: "8px",
        width: '150px'
    },
});

class Login extends Component<Props, State> {
    state: State = {
        email: '',
        password: '',
        error: 'false',
        errorMessage: '',
        fakey: '',
        faopen: false,
        tmptoken: ''
    };

    componentDidMount() : void {
        const { token } = this.props;

        if (token)
            this.props.history.push('/services');
    }

    /**
     * Function called when a user type inside a text field
     *
     * @param e event triggered
     */
    onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const { id, value } = e.currentTarget;

        if (id === 'fakey' && (value.length === 7 || isNaN(value as any)))
            return;
        this.setState({ [id]: value } as unknown as Pick<State, keyof State>);
    };

    /**
     * Function called when the user wants to close the dialog
     * of 2FA Authentication
     *
     * @param e event triggered
     */
    dialogClose = (e: React.SyntheticEvent): void => {
        this.setState({ faopen: false });
    };

    /**
     * Function called when the Alert box is closed
     *
     * @param e event triggered
     */
    onClose = (e: React.SyntheticEvent): void => {
        this.setState({ error: 'false' });
    };

    /**
     * Function called when the user submit his 2FA Authentication called
     * then finish the login.
     *
     * @param e event triggered
     */
    dialogSubmit = (e: React.FormEvent) => {
        const { fakey, tmptoken } = this.state;
        const { api_url } = this.props;

        fetch(`${api_url}/users/2fa/validate`, {
            method: 'POST',
            body: JSON.stringify({ token: fakey }),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tmptoken}` }
        })
            .then(res => res.json())
            .then((data) => {
                const { token } = data;

                if (token) {
                    cookies.set('token', token);
                    this.props.setToken(token);
                    this.props.history.push('/services');
                } else {
                    const {error} = data;

                    this.setState({error: 'true', errorMessage: `${error.name}: ${error.message}`});
                }
            });
    };

    /**
     * Function called when the user finished to enter his username
     * and password, then verify if the user has the 2FA activated.
     *
     * @param e event triggered
     */
    onSubmit = (e: React.FormEvent) => {
        const { api_url } = this.props;
        const { email, password } = this.state;
        const payload : Object = { email: email, password: password };

        fetch(`${api_url}/users/login`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        }).then((res) => {
            return res.json();
        }).then((data) => {
            const { require2fa, token } = data;

            if (!require2fa) {
                if (token) {
                    cookies.set('token', token);
                    this.props.setToken(token);
                    this.props.history.push('/services');
                } else {
                    const {error} = data;

                    this.setState({error: 'true', errorMessage: `${error.name}: ${error.message}`});
                }
            } else {
                this.setState({ faopen: true, tmptoken: token });
            }
        });
    };

    /**
     * Function called when the user type the enter key
     *
     * @param e event triggered
     * @param buttonId name of the button to click
     */
    enterKeyPress = (e: any, buttonId: string) => {
        if (e.keyCode === 13) {
            const toClick: HTMLElement | null = document.getElementById(buttonId);

            if (toClick)
                toClick.click();
        }
    };

    render() {
        const { email, password } = this.state;
        const { classes } = this.props;

        return (
            <div>
                <NavigationBar history={this.props.history} />
                <div
                    style={{
                        position: 'absolute',
                        paddingTop: '50px',
                        left: '50%',
                        transform: 'translate(-50%)',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h3" style={{textAlign: 'center'}} gutterBottom><Translator sentence="signin" /></Typography>
                    <br />
                    <TextField
                        id="email"
                        label="Email"
                        variant="outlined"
                        className={classes.field}
                        value={email}
                        onChange={this.onChange}
                        onKeyDown={(e) => {this.enterKeyPress(e, "signin")}}
                        required
                        fullWidth
                    />
                    <br />
                    <TextField
                        id="password"
                        label="Password"
                        variant="outlined"
                        type="password"
                        className={classes.field}
                        value={password}
                        onChange={this.onChange}
                        onKeyDown={(e) => {this.enterKeyPress(e, "signin")}}
                        required
                        fullWidth
                    />
                    <br />
                    <br />
                    <Link to={{ pathname: '/forgot' }} style={{ textDecoration: 'none', color: '#212121', textAlign: 'center' }}>
                        <Translator sentence="forgotPasswordLink" />
                    </Link>
                    <br />
                    <Button
                        id="signin"
                        variant="contained"
                        color="secondary"
                        className={classes.loginButton}
                        onClick={this.onSubmit}
                    >
                        <Translator sentence="signin" />
                    </Button>
                    <br />
                    <OrDivider />
                    <br />
                    <Grid container spacing={3}>
                        <Grid item xs={6}>
                            <AuthButton token={null} history={this.props.history} apiUrl={this.props.api_url} serviceName="Google" serviceIcon={<GoogleIcon />} />
                        </Grid>
                        <Grid item xs={6}>
                            <AuthButton token={null} history={this.props.history} apiUrl={this.props.api_url} serviceName="Twitter" serviceIcon={<TwitterIcon />} />
                        </Grid>
                    </Grid>
                </div>
                <Dialog
                    open={this.state.faopen}
                    onClose={this.dialogClose}
                >
                    <DialogContent>
                        <Typography variant="h5" gutterBottom><Translator sentence="twoFactorEnabled" /></Typography>
                        <Typography variant="body1"><Translator sentence="twoFactorEnabledSub" /></Typography>
                        <TextField
                            id="fakey"
                            label="Your Code"
                            variant="outlined"
                            className={classes.field}
                            value={this.state.fakey}
                            onChange={this.onChange}
                            onKeyDown={(e) => {this.enterKeyPress(e, "fa-submit")}}
                            fullWidth
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.dialogClose} color="primary">
                            <Translator sentence="cancel" />
                        </Button>
                        <Button id="fa-submit" onClick={this.dialogSubmit} color="primary" autoFocus>
                            <Translator sentence="signin" />
                        </Button>
                    </DialogActions>
                </Dialog>
                <Snackbar open={(this.state.error !== 'false')} autoHideDuration={6000} onClose={this.onClose}>
                    <Alert onClose={this.onClose} severity="error">
                        { this.state.errorMessage }
                    </Alert>
                </Snackbar>
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Login));
