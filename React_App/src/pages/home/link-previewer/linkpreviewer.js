import React, { useState } from "react";
import Popup from 'reactjs-popup';


export const LinkPreviewer = props => {
    return (
        <div>
          <img src={props.image } width = "50px" height = "50px" alt=""/>
          <div >
            <h10 >{props.title}</h10>
            <p>{props.text}</p>
          </div>
        </div>
      )
};