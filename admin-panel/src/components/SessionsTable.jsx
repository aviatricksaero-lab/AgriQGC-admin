
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
    LinearProgress,
    Box
} from '@mui/material';
import axios from 'axios';

const SessionsTable = () => {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.get(`${apiUrl}/sessions`);
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 2 }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 3 }}>
                Flight Sessions
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Username</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Start Time</TableCell>
                            <TableCell>End Time</TableCell>
                            <TableCell>Duration (min)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sessions.map((session) => (
                            <TableRow hover role="checkbox" tabIndex={-1} key={session._id}>
                                <TableCell>{session.username}</TableCell>
                                <TableCell>{session.date}</TableCell>
                                <TableCell>{session.start_time}</TableCell>
                                <TableCell>{session.end_time}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress variant="determinate" value={Math.min(session.duration, 60)} />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">{`${Math.round(session.duration)}m`}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default SessionsTable;
