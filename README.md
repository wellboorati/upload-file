# NestJS Application Challenge

## What is this challenge, what it does, its functionalities

This challenge involves creating a NestJS application that processes large file uploads efficiently, generates invoices, and sends emails based on the uploaded data. The application features include:

- Processing and validating uploaded CSV files.
- Storing debt information in a PostgreSQL database.
- Sending notification emails and payment slips using external services.
- Ensuring data integrity and retry mechanisms for failed operations.

## Tools Used

The following tools and technologies were used to build this application:

- [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.
- [TypeORM](https://typeorm.io/) - An ORM for TypeScript and JavaScript (ES7, ES6, ES5).
- [PostgreSQL](https://www.postgresql.org/) - A powerful, open-source object-relational database system.
- [Jest](https://jestjs.io/) - A delightful JavaScript testing framework with a focus on simplicity.
- [Docker](https://www.docker.com/) - A platform to develop, ship, and run applications inside containers.

## How to Use Docker to Run This Application

1. **Build the Docker images**:

   ```sh
   docker-compose build

2. **Start the services**:
  docker-compose up

This will start the NestJS application and PostgreSQL database, accessible on port 3000.

## Instructions on How to Run This Application

1. **Clone the repository**:
  git clone <repository-url>
  cd <repository-directory>

2. **Install dependencies**:
  npm install

3. **Run the application**:
  npm run start

The application will be available at http://localhost:3000.

## How to Test the Upload Endpoint

1. **Upload a CSV file**:
  Use a tool like Postman to send a POST request to http://localhost:3000/upload with a CSV file in the body.

2. **Endpoint URL**:
POST http://localhost:3000/upload

3. **Body**:
  Select form-data and add a key file with the CSV file as value.

## How to Access the Database

1. **Connect to the PostgreSQL database**:
  psql -h localhost -U postgres -d debt_db

Use the credentials specified in the docker-compose.yml file.

## How to Run the Tests
1. Run the tests:
  npm run test

This will run the unit tests using Jest.

## Contact

For any questions or inquiries, please contact:

- Email: well_boorati@hotmail.com
- LinkedIn: /wellingtonboorati












