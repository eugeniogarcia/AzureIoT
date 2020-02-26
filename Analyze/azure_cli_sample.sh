#!/bin/bash


# Create a resource group
az group create --name azuremolchapter21 --location eastus

# Define a unique name for the Service Bus namespace
serviceBusNamespace=azuremol$RANDOM

# Create a Service Bus namespace
# This namespace is used to then create a queue that allows messages to be
# transmitted between your Azure IoT Hub and applications such as Logic Apps
# and Function Apps
az servicebus namespace create --resource-group azuremolchapter21 --name $serviceBusNamespace

# Create a Service Bus queue
# This queue is used to connect Azure IoT Hub with your serverless applications
# to pass messages back and forth
az servicebus queue create \
    --resource-group azuremolchapter21 \
    --namespace-name $serviceBusNamespace \
    --name azuremol

# Define a unique name for the Storage account
storageAccount=mystorageaccount$RANDOM

# Create an Azure Storage account
# The Function App requires a Storage account
az storage account create \
	--resource-group azuremolchapter21 \
	--name $storageAccount \
	--sku standard_lrs

# Define a unique name for the Function App
functionAppName=azuremol$RANDOM

# Create a Function App
# A consumption plan is used, which means you are only charged based on the
# memory usage while your app is running. The Function App is set up to be
# manually connected to a sample app in GitHub
az functionapp create \
    --resource-group azuremolchapter21 \
    --name $functionAppName \
    --storage-account $storageAccount \
    --consumption-plan-location eastus \
    --deployment-source-url https://raw.githubusercontent.com/fouldsy/azure-mol-samples/master/21/analyzeTemperature.js