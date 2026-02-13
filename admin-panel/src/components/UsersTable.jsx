
import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip
} from '@mui/material';
import axios from 'axios';

const UsersTable = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.get(`${apiUrl}/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 2 }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 3 }}>
                Registered Users
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Username</TableCell>
                            <TableCell>Display Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Mobile</TableCell>
                            <TableCell>RPC Score</TableCell>
                            <TableCell>Joined</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow hover role="checkbox" tabIndex={-1} key={user._id}>
                                <TableCell>{user._id.substring(0, 8)}...</TableCell>
                                <TableCell align="left">{user.username}</TableCell>
                                <TableCell align="left">{user.displayname}</TableCell>
                                <TableCell align="left">{user.email}</TableCell>
                                <TableCell align="left">{user.mobile_number || '-'}</TableCell>
                                <TableCell align="left">
                                    <Chip label={user.rpc_completed} color="primary" size="small" variant="outlined" />
                                </TableCell>
                                <TableCell align="left">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default UsersTable;
