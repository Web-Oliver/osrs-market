# **OSRS Flipping AI App \- Overall Project Goal & Guidelines**

This document serves as the overarching directive for all AI agents involved in the development of the OSRS Flipping AI App. It outlines the ultimate project goal, the repository structure, and fundamental development principles that *must* be adhered to throughout the entire development lifecycle.

## **🎯 Overall Project Goal**

The primary goal is to deliver a robust, intelligent, and real-time full-stack platform that effectively analyzes the Old School RuneScape Grand Exchange (GE) market. This platform will:

* **Comprehensively Acquire Data**: Efficiently scrape and consume both live and historical OSRS GE data, ensuring a **unified, consistent, and single source of truth** for all market information within the MongoDB database.  
* **Intelligently Analyze Market Behavior**: Perform real-time market analysis, calculating and deriving critical flipping metrics and identifying profitable opportunities based on the unified dataset.  
* **Autonomously Train & Optimize AI**: Implement and train a Reinforcement Learning AI agent capable of discovering and optimizing item flipping strategies to maximize in-game profit.  
* **Provide Intuitive Visualization**: Offer a real-time, user-friendly dashboard for monitoring market activity, visualizing AI decisions, tracking training progress, and presenting key reports based on consistent, time-series metrics.  
* **Adhere to Best Practices**: Develop the entire application following modern software engineering principles, ensuring scalability, maintainability, and extensibility.

## **📂 Repository & File Structure**

All development work must be performed within the designated repositories and their specified sub-paths.

* **Python AI Microservice Repository:**  
  * **Repository URL:** https://github.com/Web-Oliver/osrs-market-ai.git  
  * **Project Path within Repo:** /apps/osrs-market-ai/ (root of this repository)  
* **Frontend & Backend (Node.js) Repository:**  
  * **Repository URL:** https://github.com/Web-Oliver/osrs-market.git  
  * **Frontend Path within Repo:** /apps/osrs-market/  
  * **Backend Path within Repo:** /apps/osrs-market/server/

## **💡 Core Development Guidelines**

All AI agents *must* strictly adhere to the following principles:

1. **Always Read spec.md**: The spec.md document is the single source of truth for all detailed requirements, current status, and specific needs. **Every development decision and implementation must be directly traceable to the spec.md**.  
2. **Always Follow TODOs**: Prioritize and address all 🚧 (TODO) items listed within the spec.md as part of the development process.  
3. **DRY (Don't Repeat Yourself)**: Avoid duplication of code, data, and logic across the entire system (frontend, backend, AI microservice). Promote reusable components, centralized utility functions, and a single source of truth for data.  
4. **SOLID Principles**:  
   * **S \- Single Responsibility Principle (SRP)**: Each class, module, or component should have one, and only one, reason to change.  
   * **O \- Open/Closed Principle (OCP)**: Software entities (classes, modules, functions, etc.) should be open for extension, but closed for modification.  
   * **L \- Liskov Substitution Principle (LSP)**: Objects in a program should be replaceable with instances of their subtypes without altering the correctness of that program.  
   * **I \- Interface Segregation Principle (ISP)**: Clients should not be forced to depend on interfaces they do not use.  
   * **D \- Dependency Inversion Principle (DIP)**: High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions.  
5. **Hierarchical Architecture**: Maintain the clearly defined separation between frontend, Node.js backend services, and the Python AI microservice. Ensure communication between these layers occurs through well-defined interfaces (REST APIs, WebSockets), promoting loose coupling and independent development.  
6. **Consistency**: Ensure consistent naming conventions, coding styles, and architectural patterns across all parts of the project.  
7. **Robustness & Error Handling**: Implement comprehensive error handling, logging, and monitoring across all layers of the application.  
8. **Scalability & Performance**: Design and implement solutions with future scalability and optimal performance in mind.

By adhering to these directives, the AI agents will collaboratively build a high-quality, maintainable, and effective OSRS Flipping AI App.