# Amazon Marketplace Integration Project

**Course:** IE4427 – E-Commerce  
**Project Type:** Term Project  
**Development Language:** Python  
**Repository:** https://github.com/liz3throdriguez/Amazon_Integration_Project

## Project Overview

This project demonstrates how an online store can integrate with Amazon Marketplace to manage product listings, inventory, customer orders, and fulfillment.

We are developing a Python-based simulation that connects a fictional e-commerce store with a mock Amazon Marketplace API.

The purpose is to demonstrate how integration can improve data consistency, reduce manual work, prevent overselling, and simplify multichannel order management.

**Note:** This is an academic simulation. It does not connect to Amazon's live marketplace or process real customer transactions.

## Project Objectives

- Demonstrate product information exchange between an online store and Amazon.
- Synchronize inventory quantities across both systems.
- Simulate Amazon customer orders and order processing.
- Track order fulfillment and shipping status.
- Identify integration errors such as duplicate SKUs, invalid prices, and insufficient inventory.
- Evaluate the operational benefits and costs of e-commerce integration.

## System Architecture

The project consists of three main components:

**1. Online Store**

A fictional accessories store containing five sample products with unique SKUs, prices, and inventory quantities.

**2. Integration Layer**

Python functions that validate product information, transfer data, synchronize inventory, and process orders.

**3. Mock Amazon Marketplace**

A simulated Amazon system that receives product listings, processes sample orders, and maintains inventory and fulfillment information.

### Integration Workflow

Online Store → Integration Layer → Mock Amazon Marketplace

The integration will support communication in both directions.

For example, when an order is placed through the simulated Amazon Marketplace, the system will process the order and update the available inventory in both systems.

## Sample Product Catalog

All products and values are fictional classroom test data.

| SKU | Product | Price | Quantity |
|---|---|---|---|
| FL001 | Mini Shoulder Bag | $35.00 | 20 |
| FL002 | Quilted Tote Bag | $48.00 | 15 |
| FL003 | Cardholder Wallet | $18.00 | 30 |
| FL004 | Satin Makeup Bag | $22.00 | 25 |
| FL005 | Gold Bag Charm | $12.00 | 40 |

## Project Structure

```text
AmazonIntegrationProject/
├── main.py
├── store.py
├── amazon_mock.py
├── integration.py
├── data/
├── docs/
├── tests/
├── README.md
└── .gitignore
```

### File Descriptions

- **main.py:** Runs the integration demonstration.
- **store.py:** Manages the online store's products and inventory.
- **amazon_mock.py:** Simulates Amazon Marketplace operations.
- **integration.py:** Handles data exchange between the store and mock Amazon system.
- **data/:** Stores sample products and order information.
- **docs/:** Contains project research, diagrams, and documentation.
- **tests/:** Contains integration test cases.

## Planned Features

- [ ] Product catalog management
- [ ] Product data mapping and validation
- [ ] Simulated Amazon product synchronization
- [ ] Inventory synchronization
- [ ] Amazon order simulation
- [ ] Order fulfillment and tracking updates
- [ ] Error detection and exception reporting
- [ ] Integration testing
- [ ] Cost-benefit analysis

## Testing

The project will include at least five test cases:

1. Successfully mapping a new product with a valid SKU.
2. Updating and synchronizing inventory quantities.
3. Processing a simulated Amazon customer order.
4. Detecting an invalid or duplicate SKU.
5. Handling insufficient inventory or a failed synchronization.

Each test will document the input, expected result, actual result, pass/fail status, and corrective actions.

## Project Deliverables

- Research comparing at least two Amazon integration approaches.
- Product and order data mapping table.
- Integration architecture and workflow diagram.
- Working Python simulation.
- At least five documented test cases.
- Cost-benefit analysis.
- Final written report.
- 12–15-minute presentation and demonstration.

## Development Setup

**Requirements:**
- Python 3
- Git
- VS Code or another Python editor

Clone the repository:

```bash
git clone https://github.com/liz3throdriguez/Amazon_Integration_Project.git
```

Navigate into the project:

```bash
cd Amazon_Integration_Project
```

Once implemented, run the simulation using:

```bash
python3 main.py
```

## Team Collaboration

Team members will collaborate through GitHub using branches and pull requests.

Before starting new work, retrieve the latest changes from the main branch. Each member should commit their changes with descriptive messages.

## Project Status

**Current Phase:** Initial setup and development.

The GitHub repository and initial Python project structure have been created. Implementation, testing, research, and documentation are in progress.

## Academic and Security Considerations

This project uses fictional products, simulated orders, and mock Amazon functionality.

No real customer information, Amazon credentials, or live marketplace transactions are required.

The simulation will be clearly distinguished from a production Amazon integration.