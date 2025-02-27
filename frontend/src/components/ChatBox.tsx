import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  Avatar,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ClearIcon from '@mui/icons-material/Clear';
import { useChat } from '../context/ChatContext';

const ChatBox: React.FC = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput('');
    }
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: expanded ? 350 : 180,
        maxHeight: expanded ? '500px' : '60px',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Chat header */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          p: 1.5, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SmartToyIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Car Valuation Assistant
          </Typography>
        </Box>
        <Box>
          {expanded && (
            <IconButton 
              size="small" 
              color="inherit"
              onClick={(e) => {
                e.stopPropagation();
                clearMessages();
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" color="inherit" sx={{ ml: 1 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>
      
      <Collapse in={expanded} timeout="auto">
        {/* Messages container */}
        <Box 
          sx={{ 
            px: 2, 
            py: 1, 
            height: 350, 
            overflowY: 'auto',
            bgcolor: '#f5f5f5',
          }}
        >
          <List sx={{ width: '100%', p: 0 }}>
            {messages.map((message) => (
              <ListItem 
                key={message.id} 
                alignItems="flex-start" 
                sx={{ 
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  px: 1,
                  py: 0.5,
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                    width: 32,
                    height: 32,
                    mr: message.role === 'user' ? 0 : 1,
                    ml: message.role === 'user' ? 1 : 0,
                  }}
                >
                  {message.role === 'assistant' ? <SmartToyIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                </Avatar>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 1.5, 
                    maxWidth: '80%',
                    bgcolor: message.role === 'assistant' ? 'white' : 'primary.light',
                    color: message.role === 'assistant' ? 'text.primary' : 'white',
                    borderRadius: message.role === 'user' 
                      ? '16px 16px 4px 16px' 
                      : '16px 16px 16px 4px',
                  }}
                >
                  <Typography variant="body2">{message.content}</Typography>
                </Paper>
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        </Box>
        
        <Divider />
        
        {/* Input form */}
        <Box 
          component="form" 
          onSubmit={handleSend}
          sx={{ 
            p: 2, 
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'white',
          }}
        >
          <TextField
            fullWidth
            placeholder="Ask about car valuations..."
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            sx={{ mr: 1 }}
          />
          <Button 
            type="submit"
            variant="contained" 
            color="primary" 
            disabled={isLoading || !input.trim()}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ChatBox;