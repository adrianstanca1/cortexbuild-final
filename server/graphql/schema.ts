import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    role: String!
    companyId: String
  }

  type Project {
    id: ID!
    name: String!
    description: String
    status: String!
    progress: Int!
    budget: Float!
    spent: Float!
    startDate: String
    endDate: String
    companyId: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    projectId: String!
    assignedTo: String
    startDate: String
    duration: Int
    progress: Int
  }

  type Query {
    me: User
    projects: [Project!]!
    project(id: ID!): Project
    tasks(projectId: ID!): [Task!]!
  }

  type Mutation {
    createProject(name: String!, description: String, budget: Float!): Project!
    updateProjectStatus(id: ID!, status: String!): Project!
  }
`;
