import pytest
import asyncio
import sys
import os
import json
from unittest.mock import Mock, patch, AsyncMock

# Add parent directory to path so we can import agent modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import command_handler

@pytest.fixture(autouse=True)
def reset_locker_state():
    """Reset the global locker process state before each test."""
    command_handler._locker_process = None
    yield
    # Cleanup if left running
    if command_handler._locker_process:
        try:
            command_handler._locker_process.kill()
        except:
            pass
        command_handler._locker_process = None

@patch('agent.command_handler.subprocess.Popen')
@patch('agent.command_handler.platform.system')
def test_lock_screen_windows(mock_system, mock_popen):
    """Test that lock_screen spawns the locker process on Windows."""
    mock_system.return_value = 'Windows'
    mock_process = Mock()
    mock_popen.return_value = mock_process
    
    result = command_handler.lock_screen("Pesan Ujian")
    
    assert result['success'] is True
    assert result['command'] == 'lock_screen'
    assert mock_popen.called
    assert command_handler._locker_process == mock_process
    
    # Check that --locker is in the arguments and the message is passed
    args = mock_popen.call_args[0][0]
    assert '--locker' in args
    assert "Pesan Ujian" in args

@patch('agent.command_handler.platform.system')
def test_lock_screen_non_windows(mock_system):
    """Test that lock_screen gracefully declines non-Windows platforms."""
    mock_system.return_value = 'Linux'
    
    result = command_handler.lock_screen("Test")
    
    assert result['success'] is False
    assert "Windows only" in result['message']
    assert command_handler._locker_process is None

@patch('agent.command_handler.platform.system')
def test_unlock_screen_when_locked(mock_system):
    """Test that unlock_screen kills the running process and resets the state."""
    mock_system.return_value = 'Windows'
    mock_process = Mock()
    mock_process.poll.return_value = None # Process is running
    command_handler._locker_process = mock_process
    
    result = command_handler.unlock_screen()
    
    assert result['success'] is True
    assert mock_process.kill.called
    assert command_handler._locker_process is None

def test_unlock_screen_when_not_locked():
    """Test that unlock_screen returns a safe success message when already unlocked."""
    command_handler._locker_process = None
    
    result = command_handler.unlock_screen()
    
    assert result['success'] is True
    assert "tidak terkunci" in result['message']

@pytest.mark.asyncio
@patch('agent.command_handler.psutil.process_iter')
async def test_taskmgr_alarm_loop(mock_process_iter):
    """Test that the alarm loop detects taskmgr, kills it, and alerts the server."""
    # Setup mock websocket
    mock_ws = AsyncMock()
    
    # Setup mock locker process (running)
    mock_locker = Mock()
    mock_locker.poll.return_value = None
    command_handler._locker_process = mock_locker
    
    # Setup mock taskmgr process
    mock_taskmgr = Mock()
    mock_taskmgr.info = {"name": "Taskmgr.exe"}
    
    # We need a way to break the infinite while loop in taskmgr_alarm_loop.
    # We will raise a specific exception when asyncio.sleep is called the second time.
    original_sleep = asyncio.sleep
    sleep_call_count = 0
    
    class BreakLoop(Exception): pass
    
    async def mock_sleep(delay):
        nonlocal sleep_call_count
        sleep_call_count += 1
        if sleep_call_count >= 2:
            raise BreakLoop("Break infinite loop")
        await original_sleep(0) # Don't actually sleep in tests
        
    mock_process_iter.return_value = [mock_taskmgr]
    
    with patch('agent.command_handler.asyncio.sleep', new=mock_sleep):
        try:
            await command_handler.taskmgr_alarm_loop(mock_ws)
        except BreakLoop:
            pass # Expected
            
    # Verify taskmgr was killed
    assert mock_taskmgr.kill.called
    
    # Verify websocket sent the alert
    assert mock_ws.send.called
    sent_data = json.loads(mock_ws.send.call_args[0][0])
    assert sent_data['command'] == 'lock_alert'
    assert sent_data['success'] is True
    assert "Task Manager" in sent_data['message']
