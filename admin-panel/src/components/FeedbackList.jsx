
import React, { useState, useEffect } from 'react';
import {
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Paper,
    Box
} from '@mui/material';
import { Person as PersonIcon, Email as EmailIcon } from '@mui/icons-material';
import axios from 'axios';

const FeedbackList = () => {
    const [feedbacks, setFeedbacks] = useState([]);

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.get(`${apiUrl}/feedback`);
            setFeedbacks(response.data);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    };

    return (
        <Paper sx={{ width: '100%', p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                User Feedback
            </Typography>
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {feedbacks.map((fb, index) => (
                    <React.Fragment key={fb._id}>
                        <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                    {fb.username ? fb.username[0].toUpperCase() : 'U'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography variant="subtitle1" color="text.primary">
                                        {fb.username || 'Anonymous'}
                                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                            {new Date(fb.created_at).toLocaleString()}
                                        </Typography>
                                    </Typography>
                                }
                                secondary={
                                    <React.Fragment>
                                        <Typography
                                            sx={{ display: 'inline' }}
                                            component="span"
                                            variant="body2"
                                            color="text.primary"
                                        >
                                            {fb.email}
                                        </Typography>
                                        {" — " + fb.comments}
                                    </React.Fragment>
                                }
                            />
                        </ListItem>
                        {index < feedbacks.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                ))}
            </List>
        </Paper>
    );
};

export default FeedbackList;
