@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================================
::  CargoPlanner - launch script
::  Sets a clear console title, moves into the script folder, verifies the
::  Node.js runtime and project dependencies, then starts the dev server.
::  The console window is always kept open so the user can read any message.
:: ============================================================================

:: Set the console window title.
title CargoPlanner - launch

:: Change to the directory that contains this script, so relative paths work
:: no matter where the script was launched from.
cd /d "%~dp0"

echo ============================================
echo   CargoPlanner - launch project
echo ============================================
echo.

:: --- Step 1: Verify that Node.js is installed --------------------------------
:: If the 'where node' command fails, Node.js is not on the PATH. Show an
:: English error message, keep the window open with pause, and exit with code 1.
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js was not found on this system.
    echo Please install Node.js 18 or newer from https://nodejs.org
    echo and make sure the 'node' command is available in PATH.
    echo.
    pause
    exit /b 1
)

:: --- Step 2: Install dependencies if needed ----------------------------------
:: If the node_modules folder is missing, run 'npm install'. On failure show
:: an error message, keep the window open, and exit with code 1.
if not exist "node_modules" (
    echo node_modules folder not found. Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies ^(npm install^).
        echo Please check your network connection and npm configuration.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Starting the development server...
echo The server will be available in your browser at: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.

:: --- Step 3: Start the development server ------------------------------------
:: The server is run through a nested shell so that an abnormal crash of
:: node/npm cannot close this batch window; control always returns here.
cmd /c call npm run dev
set "DEV_EXIT_CODE=!errorlevel!"

:: Check the exit code. A non-zero value means the server failed to start or
:: terminated unexpectedly. The window is still kept open below.
if not "!DEV_EXIT_CODE!"=="0" (
    echo.
    echo [ERROR] The dev server failed to start. Check that Node.js 18+ is installed and dependencies are present.
    echo.
)

echo.
echo [The dev server has stopped.]

:: --- Guaranteed final block ---------------------------------------------------
:: This pause is reached on every normal execution path and keeps the window
:: open so the user can read the result or any error message. Even if the
:: server crashed abnormally, the nested shell above guarantees that this
:: protective block is always executed.
echo.
echo Press any key to close this window...
pause >nul

:: Return the dev server exit code (0 on a clean run).
exit /b %DEV_EXIT_CODE%