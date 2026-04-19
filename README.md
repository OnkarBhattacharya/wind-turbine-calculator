# Wind Turbine Calculator

## Project Overview
The Wind Turbine Calculator is a tool designed to assist engineers and wind energy enthusiasts in estimating the energy production of wind turbines based on various input parameters. It aims to provide accurate calculations to facilitate better decision-making in wind farm development and energy generation.

## Features
- **Energy Production Estimates**: Calculate the expected energy output from wind turbines based on wind speed and turbine specifications.
- **Multiple Turbine Models**: Supports various wind turbine models with adjustable parameters.
- **User-Friendly Interface**: Easy to navigate interface for inputting data and retrieving results.
- **Comprehensive Reports**: Generate detailed reports on energy calculations and assumptions.

## Architecture
The application is structured into three main components:
1. **Frontend**: A responsive user interface built with HTML, CSS, and JavaScript that allows users to input data easily.
2. **Backend**: A server-side application responsible for processing input data, performing calculations, and returning results. It is built using Python.
3. **Database**: A lightweight database to store various turbine models and their specifications for easy retrieval.

## Installation
To run the Wind Turbine Calculator locally, follow these steps:
1. Clone the repository:
   ```bash
   git clone https://github.com/<owner>/wind-turbine-calculator.git
   cd wind-turbine-calculator
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
   ```
4. Open your web browser and navigate to `http://localhost:5000`.

## Usage
1. Input the wind speed (in m/s) and select the turbine model from the dropdown list.
2. Click on the 'Calculate' button to get the estimated energy production.
3. Review the results displayed on the screen, including energy output and potential savings.

## Calculation Methodology
The energy production is calculated based on the following formula:

\[ P = \frac{1}{2} * \rho * A * v^3 \]\n
Where:
- \( P \) = Power in Watts
- \( \rho \) = Air density (kg/m³)
- \( A \) = Swept area of the turbine (m²)
- \( v \) = Wind speed (m/s)

The software incorporates empirical data and standards to provide its estimates.

## Development Information
The project is developed using:
- **Programming Language**: Python for the backend and JavaScript for the frontend.
- **Framework**: Flask for the web application.
- **Database**: SQLite for storing turbine specifications.
- **Testing**: Pytest for testing functionalities.

For contributions, please fork the repository and create a pull request. For any issues, open an issue in the repository.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.