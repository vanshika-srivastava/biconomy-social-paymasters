import React, { useState, useEffect } from "react";

import { BiconomySmartAccount} from "@biconomy/account"
import { ChainId } from "@biconomy/core-types";
import { IPaymaster, 
BiconomyPaymaster,  
IHybridPaymaster,
PaymasterFeeQuote,
PaymasterMode,
SponsorUserOperationDto, 
} from '@biconomy/paymaster'

import abi from "../utils/counterAbi.json";
import { ethers } from "ethers";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


interface Props {
  smartAccount: BiconomySmartAccount
  provider: any
}

const TotalCountDisplay: React.FC<{ count: number }> = ({ count }) => {
  return <div>Total count is {count}</div>;
};

const CounterERC20: React.FC<Props> = ({ smartAccount, provider }) => {
  const [count, setCount] = useState<number>(0);
  const [counterContract, setCounterContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

 const counterAddress = "0x301e21fe3e556c3da730eda17281cde0d3bcb723" ;
 
  useEffect(() => {
    setIsLoading(true);
    getCount(false);
  }, []);

  const getCount = async (isUpdating: boolean) => {
    const contract = new ethers.Contract(counterAddress, abi, provider);
    setCounterContract(contract);
    
    const currentCount = await contract.count();
    setCount(currentCount.toNumber());
    if (isUpdating) {
      toast.success('Voila! You just paid USDC to cover your gas fees! ', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    }
  };

  const incrementCount = async () => {
    try {
      toast.info('Processing count on the blockchain!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });


      const incrementTx = new ethers.utils.Interface(["function incrementCount()"]);
      const data = incrementTx.encodeFunctionData("incrementCount");

      const tx1 = {
        to: counterAddress,
        data: data,
      };

     
  
      let partialUserOp = await smartAccount.buildUserOp([tx1]);
      let finalUserOp = partialUserOp;

      const biconomyPaymaster = smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

      const feeQuotesResponse = await biconomyPaymaster.getPaymasterFeeQuotesOrData(partialUserOp, {
            mode: PaymasterMode.ERC20,
            tokenList:[],
          });
    
          const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
          const spender = feeQuotesResponse.tokenPaymasterAddress || "";
          const usdcFeeQuotes = feeQuotes[2]
          console.log(usdcFeeQuotes)
    
          finalUserOp = await smartAccount.buildTokenPaymasterUserOp(
            partialUserOp,
            {
              feeQuote: usdcFeeQuotes,
              spender: spender,
              maxApproval: false,
            }
          );
    
          let paymasterServiceData = {
            mode: PaymasterMode.ERC20,
            feeTokenAddress: usdcFeeQuotes.tokenAddress,
          };
    
          try{
            const paymasterAndDataWithLimits =
              await biconomyPaymaster.getPaymasterAndData(
                finalUserOp,
                paymasterServiceData
              );
            finalUserOp.paymasterAndData = paymasterAndDataWithLimits.paymasterAndData;

    //   const biconomyPaymaster = smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

    //   let paymasterServiceData: SponsorUserOperationDto = {
    //     mode: PaymasterMode.SPONSORED,
    //     // optional params...
    //   };

    //   try {
    //     const paymasterAndDataResponse = await biconomyPaymaster.getPaymasterAndData(partialUserOp, paymasterServiceData);
    //     partialUserOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

        const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
        const transactionDetails = await userOpResponse.wait();

        console.log("Transaction Details:", transactionDetails);
        console.log("Transaction Hash:", userOpResponse.userOpHash);
       
        
        toast.success(`Transaction Hash: ${userOpResponse.userOpHash}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });

        getCount(true);
      } catch (e) {
        console.error("Error executing transaction:", e);
        // ... handle the error if needed ...
      }
    } catch (error) {
      console.error("Error executing transaction:", error);
      toast.error('Error occurred, check the console', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    }
  };

  return (
    <>
      <TotalCountDisplay count={count} />
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      <button onClick={() => incrementCount()}>Increment Count using ERC20 Paymaster</button>
    </>
  );
};

export default CounterERC20;
