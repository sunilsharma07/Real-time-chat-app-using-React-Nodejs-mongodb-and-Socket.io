import React, { Component } from 'react';
import debounce from "lodash/debounce";
import Linkify from 'react-linkify';

import ChatHttpServer from '../../../utils/chatHttpServer';
import ChatSocketServer from '../../../utils/chatSocketServer';

import './Conversation.css';

import { LinkPreviewer } from '../link-previewer/linkpreviewer'

class Conversation extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      messageLoading: true,
      conversations: [],
      selectedUser: null,
      state_typing: false,
      show_user_state_typing : null,
      linkpreview_text : null
    }
    this.messageContainer = React.createRef();
    this.ref_typingmessage = React.createRef();
  }

  componentDidMount() {
    ChatSocketServer.receiveMessage();  
    ChatSocketServer.receiveTyping();
    ChatSocketServer.eventEmitter.on('add-message-response', this.receiveSocketMessages);
    ChatSocketServer.eventEmitter.on('display-typing', this.receiveSocketTypingMessages);
  }

  componentWillUnmount() {
    ChatSocketServer.receiveMessage();
    ChatSocketServer.receiveTyping();
    ChatSocketServer.eventEmitter.removeListener('add-message-response', this.receiveSocketMessages);    
  }

  componentDidUpdate(prevProps) {
    if (prevProps.newSelectedUser === null || (this.props.newSelectedUser.id !== prevProps.newSelectedUser.id)) {
      this.getMessages();
    }
  }

  // componentWillReceiveProps(nextProps){
  //   console.log(">>>>>>>>>>>nextProps>")
  // }

  static getDerivedStateFromProps(props, state) {
    if (state.selectedUser === null || state.selectedUser.id !== props.newSelectedUser.id) {
      return {
        selectedUser: props.newSelectedUser
      };
    }
    return null;    
  }

  receiveSocketMessages = (socketResponse) => {
    const { selectedUser } = this.state;
      if (selectedUser !== null && selectedUser.id === socketResponse.fromUserId) {
        this.setState({
          conversations: [...this.state.conversations, socketResponse]
        });
        this.scrollMessageContainer();
      }
  }

  getMessages = async () => {
    try {
      const { userId, newSelectedUser} = this.props;
      const messageResponse = await ChatHttpServer.getMessages(userId,newSelectedUser.id);
      if (!messageResponse.error) {
        this.setState({
          conversations: messageResponse.messages,
        });
        this.scrollMessageContainer();
      } else {
        alert('Unable to fetch messages');
      }
      this.setState({
        messageLoading: false
      });
    } catch (error) {
      this.setState({
        messageLoading: false
      });
    }
  }

  sendMessage = async (event) => {
    const { userId, newSelectedUser } = this.props;
    if (event.key === 'Enter') {
      const message = event.target.value;
      const { userId, newSelectedUser } = this.props;
      if (message === '' || message === undefined || message === null) {
        alert(`Message can't be empty.`);
      } else if (userId === '') {
        this.router.navigate(['/']);
      } else if (newSelectedUser === undefined) {
        alert(`Select a user to chat.`);
      } else {
        this.sendAndUpdateMessages({
          fromUserId: userId,
          message: (message).trim(),
          toUserId: newSelectedUser.id,
        });
        event.target.value = '';
      }
    } 
    else if(event.which !== 13) {
      const message = event.target.value.trim();
      const datamessagePreview = await ChatHttpServer.getlinkpreviewMessages(userId, message, newSelectedUser.id)
      this.setState({linkpreview_text : datamessagePreview.linkdata})
      this.typingMessages({
        fromUserId: userId,
        message: true,
        toUserId: newSelectedUser.id,
      });
    }    
  }

  typingMessages(message) {
    try {
      ChatSocketServer.typingMessag(message);
    } catch (error) {
      alert(`Can't send your message`);
    }
  }

  receiveSocketTypingMessages = (socketResponse) => {
    var toUserId = socketResponse['fromUserId'];
    this.setState({
      state_typing: true,
      show_user_state_typing : toUserId,
    });
    this.handleTyping();
  }

  handleTyping = debounce(function() { // continually delays setting "isTyping" to false for 500ms until the user has stopped typing and the delay runs out
  //https://stackoverflow.com/questions/54733003/how-to-properly-display-user-is-typing-using-reactjs
    this.setState({ state_typing: false, show_user_state_typing : null });
}, 5000);


  sendAndUpdateMessages(message) {
    try {
      ChatSocketServer.sendMessage(message);
      this.setState({
        conversations : [...this.state.conversations, message]
      });
      this.scrollMessageContainer();
    } catch (error) {
      alert(`Can't send your message`);
    }
  }

  scrollMessageContainer() {
    if (this.messageContainer.current !== null) {
      try {
        setTimeout(() => {
          this.messageContainer.current.scrollTop = this.messageContainer.current.scrollHeight;
        }, 100);
      } catch (error) {
        console.warn(error);
      }
    }
  }

  alignMessages(toUserId) {
    const { userId } = this.props;
    return userId !== toUserId;
  }
  
  getMessageUI () {
    return (
      <ul ref={this.messageContainer} className="message-thread">
        {
          this.state.conversations.map( (conversation, index) => 
            <li className={`${this.alignMessages(conversation.toUserId) ? 'align-right' : ''}`} key={index}> <Linkify> {conversation.message} </Linkify> </li>
          )
        }
      </ul>
    )
  }

  getInitiateConversationUI() {
    if (this.props.newSelectedUser !== null) {
      return (
        <div className="message-thread start-chatting-banner">
          <p className="heading">
            You haven 't chatted with {this.props.newSelectedUser.username} in a while,
            <span className="sub-heading"> Say Hi.</span>
          </p>			
        </div>
      )
    }    
  }

  render() {
    const { messageLoading, selectedUser,  show_user_state_typing, linkpreview_text} = this.state;
    return (
      <>
        <div className={`message-overlay ${!messageLoading ? 'visibility-hidden' : ''}`}>
          <h3> {selectedUser !== null && selectedUser.username ? 'Loading Messages' : ' Select a User to chat.' }</h3>
        </div>
        <div className={`message-wrapper ${messageLoading ? 'visibility-hidden' : ''}`}>
          <div className="message-container">
            <div className="opposite-user">
              Chatting with {this.props.newSelectedUser !== null ? this.props.newSelectedUser.username : '----'}
            </div>
            {this.state.conversations.length > 0 ? this.getMessageUI() : this.getInitiateConversationUI()}
            
          </div>

          {selectedUser !== null && selectedUser.username ? 'Loading Messages' : ' Select a User to chat.' }
          <div> {show_user_state_typing !== null && show_user_state_typing===selectedUser.id ? 'typing Messages' : '' }</div>

          <div className="message-typer">
            <form>
              <textarea className="message form-control" placeholder="Type and hit Enter" onKeyPress={this.sendMessage}>
              </textarea>
            </form>
          </div>

          <div className="message-typer">
            <form>
              {linkpreview_text !== null ?
              <LinkPreviewer
                href= {linkpreview_text.url}
                image={linkpreview_text.images}
                title={linkpreview_text.title}
                text={linkpreview_text.description}
              >
              </LinkPreviewer> : '' }
            </form>
          </div>
        </div>
      </>
    );
  }
}

export default Conversation;
