# Old Software Workflow Documentation

## Overview

This document describes the existing Python Dash Plotly software architecture and workflow that is currently in production. This information will be used to plan the migration to the new Seasonality-website application.

## Current Architecture

### Technology Stack
- **Framework**: Python Dash Plotly
- **Language**: Python
- **Frontend**: Dash components with Plotly.js for visualizations
- **Backend**: Python-based with direct file system operations
- **Data Storage**: Local file system (CSV files in `Symbols/` directory)

### Project Structure

```
seasonality-software-main/
├── index.py                 # Main application entry point
├── index.spec              # PyInstaller spec file for executable
├── helper.py               # Utility functions
├── components/             # Dash component modules
│   ├── BestMonthlyReturn.py
│   ├── daily_temp_24-06-2024.py
│   ├── electionTab.py
│   ├── expiryReturnPercentage.py
│   ├── monthly_temp.py
│   ├── seasonality_temp.py
│   ├── streak.py
│   ├── test.py
│   └── weeklyTab.py
├── elections/              # Election data
│   ├── ElectionDates.csv
│   ├── INDIA.csv
│   └── USA.csv
├── extras/                 # Additional utilities and data
│   ├── Midcap all quotes.csv
│   ├── streak_temp.py
│   ├── streak.py
│   └── update_data/        # Data update scripts
├── others/                 # Other components
│   ├── GenerateFiles.py
│   ├── GenerateMultipleFiles.py
│   └── Seasonality.csv
├── specialDays/            # Special days data
│   └── specialDays.csv
└── Symbols/                # Market data organized by ticker
    ├── ABBOTINDIA/
    │   ├── 1_Daily.csv
    │   ├── 2_MondayWeekly.csv
    │   ├── 3_ExpiryWeekly.csv
    │   ├── 4_Monthly.csv
    │   └── 5_Yearly.csv
    ├── ACC/
    │   ├── 1_Daily.csv
    │   ├── 2_MondayWeekly.csv
    │   ├── 3_ExpiryWeekly.csv
    │   ├── 4_Monthly.csv
    │   └── 5_Yearly.csv
    └── ... (hundreds of tickers)
```

## Core Components

### 1. Main Application (`index.py`)

The main Dash application that serves as the entry point for the web interface.

**Key Features:**
- Dash web server setup
- URL routing and page navigation
- Authentication and authorization
- Main layout and navigation structure

### 2. Data Components

#### `components/seasonality_temp.py`
- Core seasonality analysis functionality
- Data processing and calculations
- Chart generation and visualization

#### `components/electionTab.py`
- Election-based analysis
- Political event impact on markets
- Special analysis for election periods

#### `components/expiryReturnPercentage.py`
- Options expiry analysis
- Return calculations for expiry dates
- Derivatives market analysis

#### `components/BestMonthlyReturn.py`
- Monthly performance analysis
- Best performing months identification
- Historical monthly return calculations

#### `components/streak.py`
- Streak analysis for market trends
- Consecutive up/down days tracking
- Trend analysis and visualization

### 3. Data Storage Structure

#### Symbols Directory Organization
Each ticker symbol has its own directory with 5 CSV files:

1. **1_Daily.csv** - Daily market data
2. **2_MondayWeekly.csv** - Monday-based weekly data
3. **3_ExpiryWeekly.csv** - Options expiry-based weekly data
4. **4_Monthly.csv** - Monthly aggregated data
5. **5_Yearly.csv** - Yearly aggregated data

#### Data Update Process (`extras/update_data/`)
- Automated data fetching from market sources
- CSV file generation and updates
- Historical data maintenance

### 4. Election Data Management

#### Election Files
- **ElectionDates.csv** - General election dates
- **INDIA.csv** - Indian election data
- **USA.csv** - US election data

### 5. Special Days Configuration

#### `specialDays/specialDays.csv`
- Market holidays and special trading days
- Custom date configurations for analysis

## Data Flow and Processing

### 1. Data Ingestion
- CSV files stored locally in `Symbols/` directory
- Manual or automated updates via `extras/update_data/` scripts
- No centralized database - direct file system access

### 2. Data Processing
- Python pandas for data manipulation
- Custom calculations for seasonality metrics
- Real-time processing on user requests

### 3. Visualization
- Plotly.js for interactive charts
- Dash components for UI elements
- Dynamic chart updates based on user selections

## User Interface Features

### 1. Navigation Structure
- Multi-page Dash application
- Tab-based interface for different analysis types
- Navigation menu for easy access to features

### 2. Analysis Types
- **Seasonality Analysis** - Historical seasonal patterns
- **Election Analysis** - Political event impact
- **Expiry Analysis** - Options expiry effects
- **Monthly Returns** - Best performing months
- **Streak Analysis** - Market trend analysis

### 3. Data Selection
- Ticker symbol selection
- Date range filtering
- Analysis period configuration
- Custom parameter settings

## Current Limitations

### 1. Scalability Issues
- File-based data storage limits scalability
- No concurrent user support optimization
- Memory constraints with large datasets

### 2. Data Management
- Manual data update processes
- No version control for data changes
- Limited data validation and error handling

### 3. User Management
- Basic authentication system
- No role-based access control
- Limited user management capabilities

### 4. Performance
- Real-time processing can be slow for large datasets
- No caching mechanisms
- Limited optimization for data-heavy operations

## Current Workflows

### 1. Data Upload and Processing
1. Admin uploads CSV files manually
2. Files stored in local `Symbols/` directory
3. Data processed on-demand when users request analysis
4. No automated data validation or error reporting

### 2. User Analysis Workflow
1. User logs into Dash application
2. Selects analysis type (seasonality, election, etc.)
3. Chooses ticker symbol and date range
4. System processes data and generates visualizations
5. Results displayed in interactive charts

### 3. Data Update Workflow
1. Admin runs update scripts in `extras/update_data/`
2. New market data fetched from external sources
3. CSV files updated in `Symbols/` directory
4. Application uses updated data on next user request

## Integration Points

### 1. External Data Sources
- Market data providers (NSE, BSE, etc.)
- Election commission data
- Economic calendar sources

### 2. File System Dependencies
- Direct access to CSV files in `Symbols/`
- Local storage for configuration files
- Manual file management for data updates

### 3. User Authentication
- Basic login system
- User session management
- Access control for different features

## Migration Considerations

### What Works Well
- Proven analysis algorithms and calculations
- Established data structure and organization
- Comprehensive market data coverage
- User-friendly interface design

### What Needs Improvement
- Data storage and management
- User management and authentication
- Performance optimization
- Scalability and concurrent access
- Data validation and error handling

### Migration Challenges
- Converting file-based data to database storage
- Maintaining existing analysis logic
- Preserving user interface functionality
- Ensuring data integrity during migration
- Training users on new interface

## Next Steps for Migration

1. **Data Migration Strategy**
   - Map CSV data structure to database schema
   - Develop data import scripts
   - Validate data integrity after migration

2. **Feature Parity Analysis**
   - Identify all existing features in old system
   - Map features to new architecture
   - Plan implementation order

3. **User Experience Design**
   - Analyze current user workflows
   - Design improved user interface
   - Plan user training and documentation

4. **Testing Strategy**
   - Develop comprehensive test cases
   - Validate analysis results match old system
   - Performance testing and optimization

5. **Deployment Planning**
   - Production environment setup
   - Data migration procedures
   - User migration and training
   - Rollback procedures if needed

## Conclusion

The old Python Dash Plotly application provides a solid foundation for seasonality analysis with proven algorithms and comprehensive market data. The migration to the new Seasonality-website application will address scalability, performance, and user management limitations while preserving the core analytical capabilities that users depend on.

This documentation serves as a reference for understanding the current system architecture and planning the migration strategy to ensure a smooth transition with minimal disruption to users.